// Uses ONLY a dedicated local PostgreSQL fixture; never reads application .env files.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const pool = new Pool({ host: '/tmp', database: 'aiw_free_revision_20261012_test' });
after(() => pool.end());
async function original(type, content = 'saved original') {
  const uuid = randomUUID();
  await pool.query(`INSERT INTO documents(uuid,user_uuid,document_type,content,version,version_type,revision_count,status,language,form_data)
    VALUES($1,'test-a',$2,$3,1,'original',0,'active','zh','{}')`, [uuid,type,content]);
  return uuid;
}
async function act(uuid, action, token = null, content = null, user = 'test-a') {
  return (await pool.query('SELECT manage_document_free_revision($1,$2,$3,$4,$5,$6) AS result',
    [uuid,user,action,token,content,{direction:'keep existing settings'}])).rows[0].result;
}
for (const type of ['personal_statement','sop','cover_letter','recommendation_letter']) {
  test(`${type}: confirmed abandonment affects only this saved document`, async () => {
    const uuid = await original(type), other = await original(type);
    assert.equal((await act(uuid,'status')).can_abandon,true);
    await act(uuid,'abandon');
    assert.equal((await act(uuid,'status')).state,'abandoned');
    assert.equal((await act(other,'status')).state,'unused');
    await assert.rejects(act(uuid,'claim',randomUUID()), /UNAVAILABLE/);
    await assert.rejects(act(uuid,'save',randomUUID(),'attempt'), /TOKEN|UNAVAILABLE/);
    assert.equal((await pool.query('SELECT content FROM documents WHERE uuid=$1',[uuid])).rows[0].content,'saved original');
    assert.equal((await act(uuid,'abandon')).state,'abandoned');
  });
  test(`${type}: concurrent optimization is one claim and one saved version`, async () => {
    const uuid = await original(type), tokens = [randomUUID(),randomUUID()];
    const claims = await Promise.allSettled(tokens.map(t => act(uuid,'claim',t)));
    assert.equal(claims.filter(x=>x.status==='fulfilled').length,1);
    const token = tokens[claims.findIndex(x=>x.status==='fulfilled')];
    await assert.rejects(act(uuid,'abandon'),/UNAVAILABLE/);
    await assert.rejects(act(uuid,'save',token,'too early'),/UNAVAILABLE/);
    await act(uuid,'ready',token);
    const saves = await Promise.all([act(uuid,'save',token,'optimized'),act(uuid,'save',token,'optimized')]);
    assert.equal(saves[0].uuid,saves[1].uuid);
    assert.equal(saves[0].version,2);
    assert.equal(saves[0].revision_settings.direction,'keep existing settings');
    const docs = (await pool.query('SELECT content FROM documents WHERE uuid=$1 OR parent_document_uuid=$1 ORDER BY version',[uuid])).rows;
    assert.deepEqual(docs.map(d=>d.content),['saved original','optimized']);
    assert.equal((await act(saves[0].uuid,'status')).state,'used');
    assert.equal((await act(uuid,'status')).has_used_free_revision,true);
    await assert.rejects(act(uuid,'claim',randomUUID()),/UNAVAILABLE/);
  });
}
test('failure release does not consume eligibility; another user/token cannot release or save',async()=>{
  const uuid=await original('sop'), token=randomUUID();
  await act(uuid,'claim',token);
  await assert.rejects(act(uuid,'release',randomUUID()),/TOKEN/);
  await assert.rejects(act(uuid,'abandon',null,null,'test-b'),/NOT_FOUND/);
  await act(uuid,'release',token);
  assert.equal((await act(uuid,'status')).state,'unused');
  await act(uuid,'claim',randomUUID());
});
test('claim versus abandonment serializes; neither can overwrite the winner',async()=>{
  const uuid=await original('personal_statement');
  const results=await Promise.allSettled([act(uuid,'claim',randomUUID()),act(uuid,'abandon')]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
  assert.ok(['running','abandoned'].includes((await act(uuid,'status')).state));
});
test('unsaved, unrelated CV and historical revisions are handled conservatively',async()=>{
  const empty=await original('sop','');
  assert.equal((await act(empty,'status')).can_abandon,false);
  await assert.rejects(act(empty,'abandon'),/NOT_SAVED/);
  const cv=await original('resume'); await assert.rejects(act(cv,'status'),/NOT_AVAILABLE/);
  const legacyRoot=await original('sop');
  await pool.query("UPDATE documents SET parent_document_uuid='' WHERE uuid=$1",[legacyRoot]);
  assert.equal((await act(legacyRoot,'status')).state,'unused');
  const old=await original('cover_letter');
  await pool.query(`INSERT INTO documents(uuid,user_uuid,document_type,content,version,version_type,parent_document_uuid,status)
    VALUES($1,'test-a','cover_letter','old revised',2,'revised',$2,'active')`,[randomUUID(),old]);
  assert.equal((await act(old,'status')).state,'used');
  assert.equal((await pool.query('SELECT count(*) FROM document_free_revisions WHERE document_uuid=$1',[old])).rows[0].count,'0');
});
test('ordinary database roles cannot forge state or invoke the internal transition function',async()=>{
  const c=await pool.connect();
  try{
    await c.query('SET ROLE authenticated');
    await assert.rejects(c.query('SELECT * FROM document_free_revisions'),/permission denied/);
    await assert.rejects(c.query("SELECT manage_document_free_revision('x','test-a','abandon')"),/permission denied/);
  }finally{await c.query('RESET ROLE');c.release();}
});
test('all transitions preserve paid generation quotas',async()=>{
  assert.deepEqual((await pool.query('SELECT user_uuid,remaining FROM service_quotas ORDER BY user_uuid')).rows,
    [{user_uuid:'test-a',remaining:9},{user_uuid:'test-b',remaining:8}]);
});
function loadTs(file) {
  const exports={};
  new Function('exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports);
  return exports;
}
const { observeRevisionStream }=loadTs('src/lib/free-revision-stream.ts');
for(const [status,expected] of [['succeeded',true],['failed',false]]){
  test(`SSE ${status}: bytes unchanged, completion persisted before forwarding`,async()=>{
    const raw=`data: {"event":"text_chunk","data":{"text":"测试"}}\r\n\r\ndata: {"event":"workflow_finished","data":{"status":"${status}"}}\n\n`;
    const bytes=new TextEncoder().encode(raw), events=[];
    const stream=new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}});
    const result=await new Response(observeRevisionStream(stream,async x=>events.push(x))).text();
    assert.equal(result,raw);assert.deepEqual(events,[expected]);
  });
}
test('interrupted SSE does not abandon or silently reopen an uncertain workflow',async()=>{
  const events=[];
  const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {"event":"text_chunk"}\n\n'));c.close();}});
  await new Response(observeRevisionStream(stream,async x=>events.push(x))).text();
  assert.deepEqual(events,[]);
});
function variables(file, source){
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),out={};
  const walk=n=>{if(ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name))out[n.name.text]=n.getText(ast);ts.forEachChild(n,walk);};walk(ast);return out;
}
test('frozen full optimization, version handlers and existing dialog components match baseline',()=>{
  for(const [kind,comp]of [['personal-statement','PS'],['sop','SOP'],['cover-letter','CoverLetter'],['recommendation-letter','RecommendationLetter']]){
    const file=`src/app/[locale]/(default)/${kind}/result/[uuid]/components/${comp}ResultClient.tsx`;
    const old=execFileSync('git',['show',`17ec185:${file}`],{encoding:'utf8'}), now=fs.readFileSync(file,'utf8');
    const normalize=s=>s.replace(/^\s*document_uuid: documentUuid,\n/gm,'').replace(/^\s*revision_token: (crypto.randomUUID\(\)|params.revision_token),\n/gm,'');
    const prev=variables(file,old), next=variables(file,now);
    assert.equal(normalize(next.handleFullRevision),normalize(prev.handleFullRevision),`${kind} full revision changed`);
    for(const name of Object.keys(prev).filter(x=>/^handle.*(Version|Final|Select|Comparison)/.test(x)))assert.equal(next[name],prev[name],`${kind} ${name} changed`);
    assert.ok(!now.includes('<ParagraphRevision'));
    for(const name of ['FullRevisionModal','RevisionModal','VersionComparison']){
      const f=`src/app/[locale]/(default)/${kind}/components/${name}.tsx`;
      assert.equal(fs.readFileSync(f,'utf8'),execFileSync('git',['show',`17ec185:${f}`],{encoding:'utf8'}));
    }
  }
  const mapping=fs.readFileSync('src/models/service-quota.ts','utf8');
  assert.ok(!mapping.includes('"revise-'));
});
test('retired endpoints return 410 without loading any quota or AI dependencies',async()=>{
  for(const name of ['revise','revise-personal-statement','revise-sop','revise-cover-letter','revise-recommendation-letter']){
    const response=await loadTs(`src/app/api/dify/${name}/route.ts`).POST();assert.equal(response.status,410);
  }
});
function loadMocked(file, mocks) {
  const exports={};
  new Function('exports','require',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(exports,id=>{
    assert.ok(Object.hasOwn(mocks,id),`unexpected dependency ${id}`);return mocks[id];
  });return exports;
}
test('four full optimization APIs retain prompt inputs, require ownership and eligibility, and never charge quotas',async()=>{
  const oldFetch=global.fetch;
  const keyNames=['PERSONAL_STATEMENT','SOP','COVER_LETTER','RECOMMENDATION_LETTER'].map(x=>'DIFY_API_KEY_REVISE_'+x);
  const oldKeys=keyNames.map(x=>process.env[x]);keyNames.forEach(x=>process.env[x]='local-test-only');
  try {
    for(const [fn,type]of [['revise-personal-statement','personal_statement'],['revise-sop','sop'],['revise-cover-letter','cover_letter'],['revise-recommendation-letter','recommendation_letter']]){
      let permitted=true,session={user:{uuid:'test-a'}},owner='test-a',requests=0,calls=[];
      const prompts={whole:'0',original_context:'unchanged original',detail:'unchanged requirement',style:'academic',language:'Chinese'};
      global.fetch=async(url,options)=>{
        requests++;assert.deepEqual(JSON.parse(options.body).inputs,prompts);
        assert.equal(url,'https://api.dify.ai/v1/workflows/run');
        return new Response('data: {"event":"workflow_finished","data":{"status":"succeeded"}}\n\n');
      };
      const route=loadMocked('src/app/api/dify/workflows/run/route.ts',{
        'next/headers':{headers:async()=>({})},
        '@/lib/auth':{customAuth:{api:{getSession:async()=>session}}},
        '@/models/document':{findDocumentByUuid:async()=>({uuid:'test-doc',user_uuid:owner,document_type:type})},
        '@/models/user':{findUserByUuid:async()=>({uuid:'test-a'})},
        '@/models/free-revision':{REVISION_DOCUMENT_TYPES:{[fn]:type},manageFreeRevision:async(uuid,user,action,token)=>{calls.push(action);if(!permitted)throw Error('unavailable');return{};}},
        '@/lib/free-revision-stream':{observeRevisionStream},
        '@/lib/resp':{respData:data=>Response.json({data}),respErr:error=>Response.json({error})},
        '@/services/dify':{difyService:{checkApiKey:()=>true}},
      });
      const request=(whole='0')=>new Request('http://localhost/api/dify/workflows/run',{method:'POST',body:JSON.stringify({function_type:fn,user:'same-existing-user',response_mode:'streaming',inputs:{...prompts,whole,document_uuid:'test-doc',revision_token:randomUUID()}})});
      const result=await route.POST(request());assert.equal(result.status,200);await result.text();
      assert.deepEqual(calls,['claim','ready']);assert.equal(requests,1);
      assert.equal((await route.POST(request('1'))).status,410);assert.equal(requests,1);
      permitted=false;assert.equal((await route.POST(request())).status,409);assert.equal(requests,1);
      session=null;assert.equal((await route.POST(request())).status,401);
      session={user:{uuid:'test-a'}};owner='test-b';assert.equal((await route.POST(request())).status,404);
    }
  }finally{global.fetch=oldFetch;keyNames.forEach((x,i)=>{if(oldKeys[i]===undefined)delete process.env[x];else process.env[x]=oldKeys[i];});}
});
test('existing document restoration copies only an owned saved version and preserves the old revision limit',async()=>{
  const uuid=await original('personal_statement');
  const restored=await act(uuid,'restore',uuid,'client text must not replace saved content');
  assert.equal(restored.content,'saved original');assert.equal(restored.version,2);
  await assert.rejects(act(uuid,'restore',uuid),/UNAVAILABLE/);
  const abandoned=await original('sop');await act(abandoned,'abandon');
  await act(abandoned,'restore',abandoned);
  assert.equal((await act(abandoned,'status')).free_revision_unavailable,true);
  const other=await original('sop'), wrong=await original('sop');
  await assert.rejects(act(other,'restore',wrong),/NOT_FOUND/);
  const busy=await original('cover_letter');await act(busy,'claim',randomUUID());
  await assert.rejects(act(busy,'restore',busy),/UNAVAILABLE/);
  const cv=await original('resume');await assert.rejects(act(cv,'restore',cv),/NOT_AVAILABLE/);
  const file='src/app/[locale]/(default)/(console)/my-documents/[uuid]/components/DocumentPreviewClient.tsx';
  assert.equal(fs.readFileSync(file,'utf8'),execFileSync('git',['show',`17ec185:${file}`],{encoding:'utf8'}));
});
