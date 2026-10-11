const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, mocks) {
  const source = ts.transpileModule(readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  const requireMock = name => {
    if (!(name in mocks)) throw Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  };
  new Function('require', 'module', 'exports', source)(requireMock, module, module.exports);
  return module.exports;
}

function database(initial = [], options = {}) {
  const rows = structuredClone(initial);
  let updates = 0;
  const client = { from() {
    const filters = [];
    let patch, single = false, limit = Infinity, ordering;
    const query = {
      select() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      gt(key, value) { filters.push(row => row[key] > value); return query; },
      gte(key, value) { filters.push(row => row[key] != null && row[key] >= value); return query; },
      order(key) { ordering = key; return query; },
      limit(value) { limit = value; return query; },
      range() { return query; },
      update(value) { patch = value; return query; },
      maybeSingle() { single = true; return query; },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          if (options.readError && !patch) return { data: null, error: { message: 'private database detail' } };
          if (patch) updates++;
          if (patch && options.updateError) return { data: null, error: { message: 'unknown write outcome' } };
          let found = rows.filter(row => filters.every(filter => filter(row)));
          if (ordering) found.sort((a, b) => String(a[ordering]).localeCompare(String(b[ordering])));
          found = found.slice(0, limit);
          if (patch && options.conflict) found = [];
          if (patch) found.forEach(row => Object.assign(row, patch));
          const data = structuredClone(found);
          return { data: single ? data[0] || null : data, error: null };
        }).then(resolve, reject);
      },
    };
    return query;
  } };
  return { client, rows, updates: () => updates };
}
const row = (remaining, overrides = {}) => ({ id: 1, user_uuid: 'synthetic', service_type: 'ps_sop', remaining, expired_at: '2099-01-01T00:00:00.000Z', ...overrides });
const quota = db => load('src/models/service-quota.ts', { '@/models/db': { getSupabaseClient: () => db.client } });

test('failed quota summary, availability and records reads reject instead of reporting zero', async () => {
  const model = quota(database([], { readError: true }));
  await assert.rejects(model.getUserQuotaSummary('synthetic'), /QUOTA_READ_FAILED/);
  await assert.rejects(model.getAvailableQuota('synthetic', 'ps_sop'), /QUOTA_READ_FAILED/);
  await assert.rejects(model.getQuotaRecordsByUserUuid('synthetic'), /QUOTA_READ_FAILED/);
});
test('successful empty queries report a genuine zero', async () => {
  const model = quota(database());
  assert.equal(await model.getAvailableQuota('synthetic', 'ps_sop'), 0);
  assert.deepEqual(await model.getUserQuotaSummary('synthetic'), { ps_sop: 0, recommendation: 0, cover_letter: 0, resume: 0, universal: 0 });
});
test('sum batches without mixing another account, expired rows or null expiries', async () => {
  const db = database([row(4), row(3, { id: 2 }), row(9, { id: 3, user_uuid: 'other' }), row(8, { id: 4, expired_at: '2000-01-01T00:00:00.000Z' }), row(6, { id: 5, expired_at: null }), row(2, { id: 6, service_type: 'universal' })]);
  assert.equal(await quota(db).getAvailableQuota('synthetic', 'ps_sop'), 7);
  assert.equal((await quota(db).getUserQuotaSummary('synthetic')).universal, 2);
  assert.equal(db.rows[3].remaining, 8); // Expired records remain stored.
});
test('two concurrent successful deductions consume two credits, not one overwritten update', async () => {
  const db = database([row(2)]), model = quota(db);
  const outcomes = await Promise.all([model.deductQuota('synthetic', 'ps_sop'), model.deductQuota('synthetic', 'ps_sop')]);
  assert.deepEqual(outcomes, [true, true]);
  assert.equal(db.rows[0].remaining, 0);
});
test('last credit has exactly one successful claimant', async () => {
  const db = database([row(1)]), model = quota(db);
  const outcomes = await Promise.all([model.deductQuota('synthetic', 'ps_sop'), model.deductQuota('synthetic', 'ps_sop')]);
  assert.equal(outcomes.filter(Boolean).length, 1);
  assert.equal(db.rows[0].remaining, 0);
});
test('oldest valid batch is consumed first and another account is untouched', async () => {
  const db = database([row(3, { id: 1, expired_at: '2099-01-01T00:00:00.000Z' }), row(1, { id: 2, expired_at: '2090-01-01T00:00:00.000Z' }), row(5, { id: 3, user_uuid: 'other' })]);
  assert.equal(await quota(db).deductQuota('synthetic', 'ps_sop'), true);
  assert.deepEqual(db.rows.map(row => row.remaining), [3, 0, 5]);
});
test('ambiguous update error is surfaced and never retried', async () => {
  const db = database([row(3)], { updateError: true });
  await assert.rejects(quota(db).deductQuota('synthetic', 'ps_sop'), /QUOTA_DEDUCTION_UNCONFIRMED/);
  assert.equal(db.updates(), 1);
});
test('bounded conflicts are surfaced instead of silently charging another bucket', async () => {
  const db = database([row(3)], { conflict: true });
  await assert.rejects(quota(db).deductQuota('synthetic', 'ps_sop'), /QUOTA_CONFLICT/);
  assert.equal(db.updates(), 3);
});
test('legacy credit model and service also surface failed reads', async () => {
  const db = database([], { readError: true });
  const model = load('src/models/credit.ts', { '@/models/db': { getSupabaseClient: () => db.client } });
  await assert.rejects(model.getUserValidCredits('synthetic'), /CREDIT_READ_FAILED/);
  const service = load('src/services/credit.ts', {
    '@/models/credit': model,
    '@/models/user': {},
    '@/models/order': { getFirstPaidOrderByUserUuid: async () => undefined },
    '@/lib/time': {}, '@/lib/hash': {},
  });
  await assert.rejects(service.getUserCredits('synthetic'), /CREDIT_READ_FAILED/);
});
test('quota API returns 503 with no-store and no database details on failure', async () => {
  const route = load('src/app/api/user/quota/route.ts', {
    '@/lib/resp': { respData: data => Response.json({ code: 0, data }), respErr: (message, status) => Response.json({ code: -1, message }, { status }) },
    '@/services/user': { getUserUuid: async () => 'synthetic' },
    '@/models/service-quota': { getUserQuotaSummary: async () => { throw Error('private database detail'); } },
  });
  const response = await route.GET();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal((await response.json()).code, -1);
});
