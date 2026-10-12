// Browser regression with synthetic documents and intercepted APIs only.
// Run against a loopback pnpm dev server; the temporary fixture route is removed.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.resolve(root, '../essmote-admin/node_modules/playwright'));
const base = process.env.TEST_WEB_URL || 'http://localhost:3000';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw Error('Loopback UI only');
const fixtureDir = path.join(root, 'src/app/result-leave-fixture.local');
const output = path.join(root, 'docs/changes/2026-10-13/assets');
const fixture = `"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { AppContextProvider } from "@/contexts/app";
import { ThemeProvider } from "@/providers/theme";
import Header from "@/components/blocks/header";
import DocumentHistoryTracker from "@/components/document-history-tracker";
import messages from "@/i18n/messages/zh.json";
import landing from "@/i18n/pages/landing/zh.json";
import PS from "@/app/[locale]/(default)/personal-statement/result/[uuid]/components/PSResultClient";
import SOP from "@/app/[locale]/(default)/sop/result/[uuid]/components/SOPResultClient";
import CL from "@/app/[locale]/(default)/cover-letter/result/[uuid]/components/CoverLetterResultClient";
import RL from "@/app/[locale]/(default)/recommendation-letter/result/[uuid]/components/RecommendationLetterResultClient";
function Fixture() {
 const q = useSearchParams(); const kind=q.get("kind") || "PS";
 if(q.get("destination")) return <div><h1>隔离目标页面</h1><Link href={"/result-leave-fixture.local?kind="+kind}>进入隔离文书</Link></div>;
 const Component = ({PS,SOP,CL,RL} as const)[kind as "PS"] || PS;
 return <><Component documentUuid={"fixture-"+kind} /><aside aria-label="隔离测试链接" style={{position:"fixed",right:24,bottom:80,zIndex:40,display:"flex",gap:12}}><a href="https://example.invalid/destination">同标签外链</a><a href="https://example.invalid/new" target="_blank">新标签外链</a><a href="#fixture-anchor">页内锚点</a><Link href={"/result-leave-fixture.local?destination=after&kind="+kind}>隔离下一页</Link><div id="fixture-anchor">锚点</div></aside></>;
}
export default function Page(){return <NextIntlClientProvider locale="zh" timeZone="Asia/Shanghai" messages={messages}><AppContextProvider><ThemeProvider attribute="class"><DocumentHistoryTracker /><Header header={landing.header as any}/><main className="[overflow-x:clip]"><Suspense><Fixture /></Suspense></main></ThemeProvider></AppContextProvider></NextIntlClientProvider>}
`;

async function run() {
  await fs.mkdir(fixtureDir); // Never overwrite an existing route.
  let browser;
  try {
    await fs.writeFile(path.join(fixtureDir, 'page.tsx'), fixture);
    await fs.mkdir(output, { recursive: true });
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const coverage = [];
    for (const kind of ['PS', 'SOP', 'CL', 'RL']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
      const page = await context.newPage();
      let state = 'unused', saved = true, failPost = false, lostPost = false, postDelay = 0, posts = 0, aiCalls = 0, logouts = 0, versionCount = 1;
      const content = 'I am applying to a graduate programme to develop my research skills. My coursework introduced me to statistics and careful interpretation of evidence.\n\nIn a supervised class project, I helped prepare a questionnaire and organised responses with my classmates. I now hope to build on that confirmed preparation through further study.';
      const doc = { uuid: 'fixture-'+kind, document_type: kind, content, version: 1, version_type: 'original', created_at: '2026-10-13T00:00:00Z', form_data: { language:'English', target:'Example University', count:'600', student_full_name:'Test Applicant', recommender_name:'Test Recommender' } };
      await context.route('**/*', async route => {
        const request=route.request(), u=new URL(request.url());
        if (u.origin !== base) {
          if(u.hostname==='example.invalid') return route.fulfill({contentType:'text/html',body:'<h1>隔离外部目标</h1>'});
          return route.abort();
        }
        const json = (data, status=200) => route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
        if (u.pathname.startsWith('/api/')) {
          if(u.pathname.endsWith('/free-revision')) {
            if(request.method()==='POST') {
              posts++; if(postDelay) await new Promise(r=>setTimeout(r,postDelay));
              if(failPost) return json({error:'isolated failure'},409);
              state='abandoned'; if(lostPost) return route.abort();
              return json({success:true,data:{state}});
            }
            return json({success:true,data:{state,can_abandon:state==='unused'&&saved,has_used_free_revision:state==='used',free_revision_unavailable:state!=='unused'}});
          }
          if(u.pathname.endsWith('/revisions')) return json({success:true,data:{revisions:[],has_used_free_revision:state==='used',free_revision_unavailable:state!=='unused'}});
          if(u.pathname.endsWith('/versions')) return json({success:true,data:{versions:versionCount===1?[doc]:[doc,{...doc,uuid:doc.uuid+'-v2',version:2,version_type:'revised',revision_count:1,content:content+'\n\nThis is the saved revised fixture.'}],total:versionCount}});
          if(u.pathname.startsWith('/api/documents/')) return json({success:true,data:doc});
          if(u.pathname==='/api/auth/get-session') return json({user:{id:'test',uuid:'test',email:'test@example.invalid',nickname:'Test'},session:{id:'test'}});
          if(u.pathname==='/api/get-user-info') return json({code:0,data:{uuid:'test',nickname:'Test',email:'test@example.invalid',created_at:'2020-01-01',invited_by:'test'}});
          if(u.pathname==='/api/auth/logout') {logouts++;return json({success:true});}
          if(/dify|generate|workflow/.test(u.pathname)) aiCalls++;
          return json({code:0,data:{},success:true});
        }
        if (!u.pathname.startsWith('/result-leave-fixture.local') && !u.pathname.startsWith('/_next/') && !/\.(png|svg|jpg|ico|woff2?)$/.test(u.pathname)) {
          return route.fulfill({contentType:'text/html',body:'<h1>隔离导航目标</h1>'});
        }
        return route.continue();
      });
      const url = base+'/result-leave-fixture.local?kind='+kind;
      const dialog=page.getByRole('dialog',{name:'确定要离开当前文书吗？'});
      async function load() {
        await page.goto(url);
        await page.getByRole('button',{name:'返回创作中心',exact:true}).waitFor();
        await page.waitForTimeout(800);
      }
      async function cancel() { await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'}); assert.equal(state,'unused'); }
      async function leaveThrough(locator,name) {
        await locator.click(); await dialog.waitFor();
        assert.equal(page.url(),url);
        await cancel(); coverage.push({kind,entry:name,result:'提示并取消留页'});
      }
      await load();
      await page.screenshot({style:'aside[aria-label="隔离测试链接"],nextjs-portal{visibility:hidden}',path:path.join(output,kind+'-desktop-return.png')});
      await leaveThrough(page.getByRole('button',{name:'返回创作中心',exact:true}),'返回创作中心');
      for(const dismiss of ['close','overlay']) {
        await page.getByRole('button',{name:'返回创作中心',exact:true}).click(); await dialog.waitFor();
        await page.waitForTimeout(250);
        if(dismiss==='close') await dialog.getByRole('button',{name:'Close',exact:true}).click();
        else await page.mouse.click(5,5);
        await dialog.waitFor({state:'hidden'}); assert.equal(page.url(),url); assert.equal(posts,0);
      }
      await leaveThrough(page.locator('nav a').filter({hasText:'Essmote AI'}),'Logo / 首页');
      for(const name of ['购买方案','使用教程','人工润色','联系我们']) await leaveThrough(page.getByRole('link',{name,exact:true}).first(),name);
      await leaveThrough(page.getByRole('button',{name:'创作中心',exact:true}).first(),'顶部创作中心');
      // The current user menu has My Documents and Sign Out, no orders/credits entries.
      await page.locator('[data-state="closed"]').filter({has:page.getByText('T',{exact:true})}).last().click();
      await leaveThrough(page.getByRole('menuitem').filter({has:page.getByRole('link')}),'用户菜单 / 我的文档');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.locator('[data-state="closed"]').filter({has:page.getByText('T',{exact:true})}).last().click();
      await leaveThrough(page.getByRole('menuitem').getByRole('button'),'用户菜单 / 退出登录');
      assert.equal(logouts,0); await page.keyboard.press('Escape');
      await leaveThrough(page.getByRole('link',{name:'同标签外链',exact:true}),'同标签外链');
      await page.getByRole('link',{name:'页内锚点',exact:true}).click();
      assert.equal(await dialog.count(),0); await page.goto(url); await page.waitForTimeout(800);
      const [popup] = await Promise.all([page.waitForEvent('popup'),page.getByRole('link',{name:'新标签外链',exact:true}).click()]);
      await popup.close(); assert.equal(await dialog.count(),0);
      await page.getByRole('button',{name:'返回创作中心',exact:true}).click(); await dialog.waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({style:'aside[aria-label="隔离测试链接"],nextjs-portal{visibility:hidden}',path:path.join(output,kind+'-desktop-dialog.png')});
      await page.getByRole('button',{name:'使用免费优化',exact:true}).click();
      await page.getByRole('dialog').filter({has:page.getByText(kind==='CL'?'求职信修改设置':'整篇重写设置',{exact:true})}).waitFor();
      assert.equal(posts,0); assert.equal(aiCalls,0);
      await page.keyboard.press('Escape');
      await load();
      await page.setViewportSize({width:390,height:844});
      await page.waitForTimeout(300);
      await page.screenshot({style:'aside[aria-label="隔离测试链接"],nextjs-portal{visibility:hidden}',path:path.join(output,kind+'-mobile-return.png')});
      const button=await page.getByRole('button',{name:'返回创作中心',exact:true}).boundingBox(); assert.ok(button.height>=44);
      await page.getByRole('button',{name:'返回创作中心',exact:true}).click(); await dialog.waitFor();
      await page.waitForTimeout(300);
      await page.screenshot({style:'aside[aria-label="隔离测试链接"],nextjs-portal{visibility:hidden}',path:path.join(output,kind+'-mobile-dialog.png')});
      const box=await dialog.boundingBox(); assert.ok(box.x>=0&&box.x+box.width<=390); assert.ok(box.y>=0&&box.y+box.height<=844);
      await cancel();
      await page.locator('button[data-slot="sheet-trigger"]').click();
      assert.equal(await dialog.count(),0);
      const sheet=page.locator('[data-slot="sheet-content"]');
      for(const name of ['购买方案','使用教程','人工润色','联系我们']) {
        await leaveThrough(sheet.getByRole('link',{name,exact:true}),'手机菜单 / '+name);
      }
      await leaveThrough(sheet.getByRole('button',{name:'创作中心',exact:true}),'手机菜单 / 创作中心');
      await sheet.getByRole('button',{name:'Close',exact:true}).click();
      await sheet.waitFor({state:'hidden'});
      await page.setViewportSize({width:1440,height:1000});
      await page.getByRole('button',{name:'复制',exact:true}).first().click();
      assert.equal(await dialog.count(),0);
      await page.getByRole('button',{name:'导出',exact:true}).first().click();
      assert.equal(await dialog.count(),0);
      const downloadPromise=page.waitForEvent('download');
      await page.getByRole('menuitem',{name:'导出为 TXT'}).click();
      const download=await downloadPromise; assert.ok((await download.path()));
      assert.equal(await dialog.count(),0);
      // A rejected POST cannot navigate; a committed POST with lost response must reconcile.
      failPost=true;
      await page.getByRole('button',{name:'返回创作中心',exact:true}).click(); await dialog.waitFor();
      await page.getByRole('button',{name:'我已了解，直接离开',exact:true}).click();
      await page.getByText('未能确认放弃状态，请留在本页重试。',{exact:true}).first().waitFor();
      assert.equal(page.url(),url); assert.equal(state,'unused'); await cancel();
      failPost=false; lostPost=true;
      await page.getByRole('link',{name:'购买方案',exact:true}).first().click(); await dialog.waitFor();
      await page.getByRole('button',{name:'我已了解，直接离开',exact:true}).click();
      await page.waitForURL('**/pricing'); assert.equal(state,'abandoned');
      for(const unavailable of ['used','abandoned']) {
        state=unavailable; await load();
        await page.getByRole('button',{name:'返回创作中心',exact:true}).click();
        await page.waitForURL('**/creation-center'); assert.equal(await dialog.count(),0);
      }
      state='used'; versionCount=2; await load();
      if(kind==='PS'||kind==='SOP') {
        await page.getByRole('button',{name:/^版本\s*1$/}).click();
        await page.getByRole('menuitem',{name:/版本 2/}).click();
      } else {
        await page.getByRole('combobox').filter({hasText:'原始版本'}).click();
        await page.getByRole('option',{name:/修改版本/}).click();
      }
      assert.equal(await dialog.count(),0);
      await page.getByRole('button',{name:kind==='PS'||kind==='SOP'?'版本对比':'对比',exact:true}).click();
      const comparison=page.getByRole('dialog',{name:'版本对比',exact:true}); await comparison.waitFor();
      assert.equal(await dialog.count(),0); await page.keyboard.press('Escape'); await comparison.waitFor({state:'hidden'});
      versionCount=1;
      state='unused'; saved=false; await load();
      await page.getByRole('button',{name:'返回创作中心',exact:true}).click();
      await page.waitForURL('**/creation-center'); assert.equal(await dialog.count(),0);
      state='unused'; saved=true; lostPost=false; await load();
      // Indexed browser history: return to the same entry on cancel, then traverse once on confirmation.
      await page.goto(base+'/result-leave-fixture.local?destination=before&kind='+kind);
      await page.getByRole('link',{name:'进入隔离文书'}).click();
      await page.getByRole('button',{name:'返回创作中心',exact:true}).waitFor(); await page.waitForTimeout(800);
      await page.evaluate(()=>history.back()); await dialog.waitFor(); await cancel(); assert.equal(page.url(),url);
      await page.evaluate(()=>history.back()); await dialog.waitFor();
      await page.getByRole('button',{name:'我已了解，直接离开',exact:true}).click();
      await page.getByRole('heading',{name:'隔离目标页面'}).waitFor(); assert.ok(page.url().includes('destination=before'));
      // Build a forward entry without altering real history or issuing abandonment.
      state='used'; await load(); await page.getByRole('link',{name:'隔离下一页',exact:true}).click();
      await page.getByRole('heading',{name:'隔离目标页面'}).waitFor(); state='unused';
      await page.evaluate(()=>history.back()); await page.getByRole('button',{name:'返回创作中心',exact:true}).waitFor(); await page.waitForTimeout(800);
      await page.evaluate(()=>history.forward()); await dialog.waitFor(); await cancel(); assert.equal(page.url(),url);
      await page.evaluate(()=>history.forward()); await dialog.waitFor();
      await page.getByRole('button',{name:'我已了解，直接离开',exact:true}).click();
      await page.getByRole('heading',{name:'隔离目标页面'}).waitFor(); assert.ok(page.url().includes('destination=after'));
      state='unused'; await load(); postDelay=600;
      const beforePosts=posts;
      await page.getByRole('button',{name:'返回创作中心',exact:true}).click(); await dialog.waitFor();
      await page.getByRole('button',{name:'我已了解，直接离开',exact:true}).dblclick();
      assert.equal(page.url(),url);
      await page.waitForURL('**/creation-center'); assert.equal(posts,beforePosts+1);
      assert.equal(aiCalls,0); assert.equal(logouts,0);
      coverage.push({kind,entry:'关闭/Esc/蒙层、优化设置、失败留页、丢响应核对、已使用/放弃、未保存、后退/前进、重复提交、复制/TXT下载/版本切换及对比/锚点/新标签',result:'通过'});
      await context.close();
      console.log(kind+': passed');
    }
    await fs.writeFile(path.join(output,'coverage.json'),JSON.stringify(coverage,null,2));
  } finally {
    await browser?.close();
    await fs.rm(fixtureDir,{recursive:true,force:true});
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
