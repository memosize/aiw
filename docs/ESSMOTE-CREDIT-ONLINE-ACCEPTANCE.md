# AIW 线上复现与验收步骤

对应补丁：795ee66、5056193；本地 12 项内存模拟回归通过。补丁尚未 push/部署，当前线上不会自动具有修复后的行为。本文件提供复现和验收流程，不代表这些步骤已经在线执行成功。

## 1. 准备和记录

- 线上只读核查可使用已有账号；扣次和故障注入必须使用独立验收环境、专用测试账号和测试额度，不动真实用户余额、不关闭生产数据库权限。
- 使用 AIW 正式站域名，记为 `<线上域名>`。入口是 `/my-credits`；中文是默认语言，不需要加 `/zh`。
- 记录环境、部署 SHA、操作时间（北京时间）、测试编号、请求状态和操作前后五类余额。受限证据中保存批次核对结果；公开截图遮住个人信息和支付凭证。
- 如已有 localhost 循环重定向，不使用该页面结果证明正式环境异常；先在正式站确认实际页面可以访问。

## 2. 可立即在线执行：确认是显示问题、到期还是两套账本不一致

### A01：正常读取及重新登录后余额

1. 登录一个确认还有服务次数的账号，打开 `<线上域名>/my-credits`，记录 PS/SOP、推荐信、Cover Letter、简历、通用五个数。
2. 同一浏览器另开 `<线上域名>/api/user/quota`，这是只读 GET，保留现有登录 cookie。预期 JSON 为 `code:0`，data 包含 `ps_sop/recommendation/cover_letter/resume/universal`。
3. 比较接口五个数与次数页面。刷新、退出登录再登录、重新打开两处，期间不要点击生成/修改/扣次。
4. 预期：数值一致且无消费时不减少。修复版本的成功接口应有 `Cache-Control:no-store`。
5. 失败标准：接口 code:0 而页面不一致，或无消费/到期/后台调整时刷新就减少。须保留同时间数据库批次和请求证据，不能仅凭截图判断实际丢失。

### A02：账号显示 0，但购买过——只读分流

1. 登录反馈账号，重复 A01 第 1–2 步，记下时间和接口状态。
2. 运营人员只读查看该账号 service_quotas 的服务类型、remaining、expired_at，以及 orders 的付款/到期信息；不要编辑记录。
3. 若可访问 PostgreSQL，以下查询由授权人员用该用户 UUID 参数执行。它只读，不输出用户标识：

```sql
-- psql：由操作人员在自己的受限会话中设置 user_uuid 参数。
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT service_type,
       coalesce(sum(remaining) FILTER (WHERE remaining>0 AND expired_at>=now()),0) AS available,
       coalesce(sum(remaining) FILTER (WHERE remaining>0 AND expired_at<now()),0) AS expired_unused,
       count(*) FILTER (WHERE expired_at IS NULL) AS null_expiry_rows
FROM service_quotas
WHERE user_uuid=:'user_uuid'
GROUP BY service_type;
SELECT coalesce(sum(credits) FILTER (WHERE expired_at>=now()),0) AS legacy_valid_credits
FROM credits WHERE user_uuid=:'user_uuid';
COMMIT;
```

4. 按结果判定：
   - service_quotas 有未到期余额，但接口成功返回 0：继续查 API 使用的数据库、用户 UUID、Supabase 权限和服务端错误日志；这是优先复现样本。
   - 只有 expired_unused 为正：数据仍保存，只是到期后不计可用；不是本次查询失败修复的对象。
   - legacy_valid_credits 为正、service_quotas 没有有效余额：旧积分和服务次数不一致；本次补丁不会把旧积分自动转换。
   - 后端有读取故障日志且旧版接口仍 code:0/全 0：符合已定位的错误吞零路径。仅数据库网络层错误是否发生过，需要服务端日志佐证。
5. 查询失败或证据不足，记“无法确认”；不直接补发或修改 expired_at。

## 3. 确定性复现“查询失败显示 0”——独立验收环境

浏览器设 Offline、拦截 `/api/user/quota` 或把它改成 503，**不能复现本次根因**：my-credits 是服务端直接查询 service_quotas；关键故障发生在应用服务端→Supabase，而不是浏览器→应用。浏览器改响应最多验证页面另一条链路。

### B01：服务端读取故障（核心必验）

准备：独立验收环境有一批未到期 PS/SOP=5 的合成额度；先按 A01 确认界面和接口都是 5。使用验收环境已有的可控代理/测试适配器，在应用服务端的 Supabase REST 出站层注入故障。不要改全局生产配置、用户权限或数据。

1. 只拦截验收实例发出的 `/rest/v1/service_quotas` **GET**，返回 HTTP 503、JSON `{"message":"acceptance read unavailable"}`；users/session 等认证查询保持可用，所有写请求均禁止进入本次故障注入。
2. 重新访问验收站 `/api/user/quota`，保存 HTTP 状态及 JSON。
3. 刷新 `/my-credits`，保存页面提示。
4. 取消拦截，再次访问接口、刷新页面。

| 阶段 | 旧版可复现结果（依源代码及本地模拟） | 修复后验收结果 |
| --- | --- | --- |
| 正常 | 5 | 5 |
| 额度 GET 返回故障 | 接口仍成功且五类为 0；页面显示无次数/空记录 | 接口 HTTP 503、code:-1，提示“暂时无法读取次数，请稍后重试。”；页面提示“暂时无法读取次数，请稍后刷新重试。”，不显示余额为 0 |
| 恢复 | 重新读取后回到 5 | 重新读取后回到 5 |

每个阶段只读核对数据库，该合成批次 remaining 始终为 5；故障不应改变任何额度。

这项我已在本地通过内存 Supabase 模拟和页面函数测试验证，**尚未在真实 Supabase/浏览器环境完成故障注入验收**。如果验收环境没有出站故障注入能力，此项应标“待验收”，不能用浏览器断网代替。

### B02：只让历史记录查询失败

1. 保持汇总 GET 成功，仅让 service_quotas 的历史记录查询（`select=*`，按 created_at 降序/分页）返回 503；服务端汇总查询（`select=service_type,remaining`）不拦截。
2. 刷新 `/my-credits`。
3. 修复后预期：显示读取失败提示，不展示“没有次数记录”；取消拦截后恢复完整页面。
4. 本地页面模拟已验证该分支；线上仍需真实出站拦截能力。

## 4. 并发扣次验收——仅专用测试额度

这些操作会真实减少验收账号次数，不发起 Dify 模型请求。不得在真实付费用户账号执行，也不要自动调用 refund-quota 补回，因为本次扣次没有关联合法失败文档。

### C01：仅剩 1 次，两个并发请求

准备：验收账号所有有效服务批次仅 PS/SOP=1，通用=0；无其他有效 PS/SOP 批次、无人同时操作。通过验收夹具准备，不修改生产数据。

登录验收站后，在该站浏览器开发者工具 Console 执行一次：

```js
const results = await Promise.all(Array.from({length: 2}, async () => {
  const response = await fetch('/api/user/deduct-quota', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({function_type: 'personal-statement'})
  });
  return {status: response.status, body: await response.json()};
}));
console.table(results.map(r => ({status:r.status, code:r.body.code, message:r.body.message})));
```

修复后：恰好一个 code:0；另一个在无其他竞争时 HTTP 402/code:-1；数据库 remaining=0、不为负，页面/只读接口均为 0。不能两个都返回成功。旧版在读取重叠时可能两次都成功；这个竞争问题不是每次点两下都必现，本地模拟通过强制重叠读验证了修复。

### C02：剩 2 次，两个并发请求

准备另一个验收账号或重置合成测试夹具：仅同一个有效 PS/SOP 批次 remaining=2、通用=0。执行 C01 的两请求代码一次。

修复后：两个成功则 remaining 必须为 0；不允许两个成功而 remaining=1。若因数据库故障返回 503，标记环境异常，核对余额后停止，不自动重试。该项针对旧版丢更新（少扣/假成功），不能用来证明历史多扣。

### C03：批次顺序及账号隔离

准备测试账号 A：较早到期 PS/SOP=1、较晚到期 PS/SOP=3；账号 B：PS/SOP=5。A 单次调用 deduct-quota。预期：A 只减少较早批次 1 次，总可用从 4→3；晚批次保持 3，B 保持 5。到期批次和 NULL 有效期批次保持原数据，不参与扣次。

## 5. 本次不能宣称已修复的验收项

- 同一个生成动作被重复提交：接口尚无任务级幂等键；两个独立扣次请求都合法时仍会扣两次。
- 扣次成功后文档创建失败、用户退出、Dify 502/超时：本轮没有统一改退款规则，不能要求都自动返还。
- 旧 credits 有余额而 service_quotas 无余额：没有自动迁移。
- 正常到期或 NULL 有效期：没有自动延长、永久有效或恢复。

如要复现这些风险，必须另用专用验收任务记录扣次→建文档→模型→保存的时间线，先明确业务验收标准，不以本轮 12 项测试证明端到端幂等或历史恢复已经完成。

## 6. 验收回执

每项填写：测试编号、环境/部署 SHA、测试时间、操作前余额、请求 HTTP/code、页面结果、操作后数据库批次、通过/失败/待验收。B01 是本次“失败显示 0”修复的核心验收，C01/C02 是并发修复的核心验收；A01/A02 是线上安全诊断步骤。核心项未在验收环境完成前，结论写“本地模拟通过，线上待验收”。
