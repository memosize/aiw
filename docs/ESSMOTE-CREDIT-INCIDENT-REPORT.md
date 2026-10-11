# Essmote / AIW 用户次数异常排查报告

日期：2026-10-11（Asia/Shanghai）。目标仓库：`aiw`，基线 `17ec185`，分支 `main`。

本轮先只读梳理代码与历史，再准备最小本地补丁和模拟测试。没有连接或修改生产数据库，没有补发、清零、迁移、部署或 push。此前误定位到相邻的 essmote/essmote-server，相关本地补丁已分别通过 revert 撤销；两者代码内容恢复原状。本报告只讨论 AIW。

## A. 结论

### 已确认：读取失败被伪装为次数为 0

`src/models/service-quota.ts:getUserQuotaSummary` 原实现遇到 Supabase 错误或缺失 data，返回五类次数全为 0 的对象；`getAvailableQuota` 返回 0；`getQuotaRecordsByUserUuid` 返回空数组。`/api/user/quota` 因此返回成功响应，`my-credits` 页面显示无次数和无记录。数据库权限、表缺失、网络、Supabase 故障等均可能触发，**这证明存在错误显示路径，不证明数据库额度实际丢失**。

旧账本也有同类问题：`src/models/credit.ts:getUserValidCredits` 将查询错误吞成 undefined，`src/services/credit.ts:getUserCredits` 返回初始 0。新补丁让这些读取明确失败，次数接口返回 503/no-store，次数页展示可重试的读取失败信息，不宣称余额为 0。中英文提示同步。

### 已确认：旧积分和新服务次数是两套不同的数据

`credits` 保存正负交易，`service_quotas` 保存分服务的批次 remaining。当前“我的次数”只汇总后者；`get-user-info`/`get-user-credits` 仍读取旧 credits。`useUserCredits` 从 2026-04-01 起被禁用，固定返回 0；对应 `/api/user/credits` 也被禁用，不能用它判断服务次数。

历史用户若只有 credits、没有 service_quotas，当前服务次数会显示 0。代码中存在这种兼容风险，但生产是否有此类用户尚未确认。旧积分还可能来自注册赠送、折扣奖励等，不能把 credits 余额直接当作应补服务次数，不能简单把两个表相加。

### 已确认：到期时过滤，不是到期时删除

所有服务可用查询都要求 `remaining>0 AND expired_at>=当前时间`。到期后原 remaining 仍在表中，但不计入可用；NULL expired_at 同样被排除，是否应有效必须查原规则，不能自动当作永久有效。注册赠送旧积分一年有效；后台补发服务次数一年有效；邀请服务奖励一年有效；PS 返还取最近可用批次的最晚有效期，缺失时默认三个月。

中文套餐配置当前为单项及新人三个月、单校六个月、多校和两类通用套餐十二个月，文案与 valid_months 一致。`checkout` 和 `xunhu-pay` 从**创建订单时**计算到期日，不是从付款到账时计算；延迟付款会缩短实际使用期。一次性订单的 valid_months 由请求传入，未与服务端套餐快照完全校验。此风险需专门审批支付补丁，本轮不更改支付或期限规则。

### 已确认：扣次与生成不是原子流程，存在重复扣次和失败保留扣次的风险

PS、SOP、推荐信、Cover Letter、简历的生成表单先调用 `/api/user/deduct-quota`，再保存文档、进入结果页调用 Dify。扣次接口没有请求幂等键，也没有绑定唯一 document/task。扣次后创建文档失败、页面退出、重复提交或不同标签页提交，可能扣了次数但没有交付。这是可追踪的代码路径，生产发生次数仍需日志验证。

PS 对某些结构化错误/失败结果会由浏览器调用 refund-quota；不是所有异常都走返还。其他功能没有对应的通用返还链路。专用 PS/推荐信/Cover Letter 修改接口先扣次再调用模型，SOP 专用修改接口在模型完成后扣次；共用流式 workflows/run 由注释假定前端已扣，不再扣次。故不能简单认定所有修改都收费或都免费，也不能统一对所有失败补偿。

`refund-quota` 仅校验用户和 PS 文档，不核验实际扣次、服务端失败状态；refundQuota 的“查 refundKey 再插入”不是事务，仓库没有可证明的对应唯一约束。是否存在重复返还、虚假返还必须核对生产 schema 和记录。本轮不改退款规则。

### 已确认并准备修复：扣次并发更新不可靠

旧 `deductQuota` 先读 remaining，再写 remaining-1，只要求更新时 remaining>0，并且没有检查受影响行。两个并发请求读到 2 都写 1，可能两个返回成功但只减一次；读到最后 1 次时，一个更新零行仍可能返回成功。**这个缺陷主要是少扣/假成功，不能作为“多扣次数”的证据。** 新补丁按旧余额 compare-and-swap，校验返回行，遇到确认冲突最多重读三次，异常写入结果不自动重试，也不在冲突后悄悄改扣通用池。它解决并发扣减一致性，不能替代任务级幂等。

数据库真实数据丢失、实际异常扣除金额、受影响用户、提前到期实际案例、身份关联异常：**暂时无法确认**。

## B. 完整链路和证据

| 环节 | 代码/字段 | 关键行为 |
| --- | --- | --- |
| 套餐 | `src/i18n/pages/pricing/zh.json`；`src/models/service-quota.ts:PRODUCT_QUOTA_MAP` | ps/sop=ps_sop；推荐信/CL/简历独立池；10/20 次通用池。中文、英文套餐不是同一产品目录 |
| 创建订单 | `src/app/api/checkout/route.ts`、`xunhu-pay/route.ts`；orders | 保存 user_uuid/product_id/credits/valid_months/expired_at/status；checkout 查英文目录，xunhu-pay 查中文目录，历史兼容需核对 |
| 支付回调 | `src/app/api/xunhu-notify/route.ts`；`src/services/order.ts:handlePaidOrder` | 验签后按订单号查用户；先更新 paid 再入账，非同一数据库事务。已 paid 重入会尝试补齐额度 |
| 双写到账 | `src/services/credit.ts:updateCreditForOrder`；`src/models/service-quota.ts:addQuotasForOrder` | 写 credits，同时按产品映射新增 service_quotas；多次购买是新增不同 order_no 的批次，不直接覆盖旧批次 |
| 到账幂等 | findCreditByOrderNo / addQuotasForOrder | 查询后插入，不是完整事务；已有任一服务批次就跳过整个订单，历史部分缺项不能靠重回调补齐；并发是否有数据库唯一保护未知 |
| 存储 | `data/install.sql` credits/orders；`src/models/service-quota.ts:ServiceQuota` | credits 有 trans_no 唯一；service_quotas 的实际 DDL 未在已跟踪安装脚本中找到，不能猜测其约束、触发器或定时任务 |
| 身份 | `src/lib/auth.ts`；`src/services/user.ts:getUserUuid` | Better Auth users.id 映射 uuid，自定义 session.user_id 查用户；接口依服务端 session，不接受客户端直接指定扣次用户；历史账号合并尚未验证 |
| 读取显示 | `src/app/[locale]/(default)/(console)/my-credits/page.tsx`；`/api/user/quota` | 展示五类 service_quotas 汇总及最近 100 条记录，旧 credits 不展示；原错误吞成空/0 |
| 扣次入口 | `src/lib/check-quota.ts`；`/api/user/deduct-quota` | 类型额度优先，不足再用 universal；每请求扣 1，未绑定任务及请求幂等键 |
| 生成链路 | 各 `*GeneratorClient.tsx`；`/api/dify/workflows/run` | 先扣、后建文档、后模型；分离请求无整体事务，也无服务端预留/消费账本 |
| PS 返还 | PSResultClient/refundGenerationQuota；`/api/user/refund-quota` | 仅部分失败触发，插入新配额批次，非恢复原消费批次；refundKey 为 ps-generation-refund:documentUuid |
| 人工调整 | `src/app/api/admin/users/update-credits`；addAdminQuota/removeAdminQuota | 增加时新建 admin_manual 批次，不覆盖原购买；减少时逐批 CAS，但多批不在同一事务，竞争失败可留下部分减少，现有审计不足 |
| 奖励 | `src/services/affiliate.ts`；affiliates | 推荐奖励按独立 invite_order 批次，一年有效；需用历史 reward_quotas 快照核对，不重复算作购买 |

### 历史变更

- `3f899be`（2026-03-31）：配额管理等初始功能；`a66934b`（2026-04-01）：旧积分 hook 禁用等上线调整。
- `4377465`（2026-04-20）：新人/单校赠送数量调整、到账防重复检查；使用当前映射反推更早订单会误算赠送次数。
- `53cdadd`（2026-05-07）、`578726b`（2026-08-04）、`dcafc8a`（2026-08-05）：额度相关历史变更，具体生产发布日期待查。
- 当前 HEAD `17ec185`（2026-10-04）主要调整人工润色提示及创建中心。不能根据 HEAD 假设生产一定已部署该版本。
- 三个月套餐在到期边界可能集中显示 0，是应核查群体，不能未经订单日期核对就认定为本次根因。

## C. 影响范围和只读调查

生产统计尚未获取：无法确认受影响人数、异常次数、首次时间或是否仍持续。显示错误是所有额度查询用户都可能遇到的系统路径；扣次缺少任务幂等可能影响多标签页、重试和扣次后未完成文档的用户；旧账本兼容风险集中于仅有 credits 的历史账号。

新增 `docs/credit-incident-audit.sql`：显式选择数据库后使用 SELECT-only 角色执行，事务为 repeatable-read/read-only，语句超时 30 秒，仅输出聚合结果，不输出 UUID、邮箱、支付凭证、API Key 或连接信息。脚本没有修复或迁移操作；表缺失时停止并保留诊断，不自动建表。

聚合覆盖：购买但服务可用 0、多次购买、人工补发、正常余额、旧积分仍为正但服务为 0、过期未用、NULL 有效期、缺购买入账、缺服务批次、重复订单服务批次。失败用户还需关联 Dify 日志及 documents：当前 service_quotas 没有完整消费任务账本，不能从剩余值准确识别失败扣次群体。

本轮只做本地模拟，不将生产凭证加载到测试，不运行该脚本查询生产。生产只读核对还需要受限连接/导出、真实 schema（含函数、触发器、定时任务、RLS）、部署版本和代表性用户的完整记录。五类用户中，有失败记录的用户不能仅凭 quota 表识别，明确标记“无法确认”。

## D. 最小补丁与后续方案

### 已准备的本地补丁

1. 额度读取错误向上传递，阻止把数据库不可用当作 0；旧 credits 同样处理。
2. `/api/user/quota` 对读取故障返回 503 和 no-store，不暴露数据库错误细节；`my-credits` 显示中英文读取失败提示。
3. `deductQuota` 加入旧余额条件与返回行检查；限制竞争重试，写入结果不明时不再次扣。
4. 新增离线模拟回归和只读聚合 SQL。未变更已有 NULL/到期语义、赠送次数、退款期限、支付或登录规则。

### 后续按严重程度推进

- P0：以 document/task/requestKey 建立服务端唯一的预留→成功交付消费→已证实失败释放生命周期，数据库事务/唯一键约束幂等；覆盖所有生成、流式和修改入口。先明确实际模型完成但保存失败的业务处理，不按浏览器断网自动返还。
- P0：审核扣次前置与文档创建失败场景，避免重复扣次；在完善任务账本前，不依据点击重试次数推算应补额度。
- P1：审计回调双写、历史部分配额到账、生产唯一约束；逐订单 dry-run 补齐缺失服务类型，不回放整个支付回调、不重复赠送。
- P1：核对客户端有效期参数与套餐快照；明确起算点，并独立审核修复。不得为本次排查直接延长历史订单。
- P1：将人工减少、退款返还关联原批次并记录完整审计，避免跨批次部分失败及无法恢复历史扣减。
- P2：独立展示旧积分、服务次数、到期状态和账户归属；旧积分迁移必须有购买凭据和当时套餐规则，不自动转换。

## E. 验证、恢复与回滚

### 提交后本地验证计划

`node --test scripts/credit-incident.test.cjs` 使用 TypeScript 本地转译和内存 Supabase 模拟，不建立任何网络连接，不引入新包。覆盖读取错误/真实 0、分账户分批汇总、到期/NULL 保持原规则、并发扣次、最后一次争抢、最近到期优先、写入异常不重试、冲突上限、旧 credits 错误及 API 503/no-store。

`pnpm lint`、TypeScript 检查、`pnpm build`；记录现有项目问题，不能把忽略 TypeScript 错误的 build 当作类型通过。浏览器只检查本地页面和不触发模型的入口。本地 SQL 可用合成表/记录验证；不以模拟结果冒充生产调查。

| 场景 | 可确认内容 / 待验证内容 |
| --- | --- |
| 购买后重登录 | 代码按 user_uuid 读取；真实回调/登录及生产余额一致性待样本 |
| 第二次购买 | 新增独立订单批次，模拟汇总验证；回调并发与部分缺项待 DB 约束 |
| 成功生成一次 | 扣次和交付分离，尚不能证明端到端恰好一次；此轮仅验证单次和并发扣次更新 |
| 生成失败、502/503/超时 | 存在先扣无交付路径；没有统一退款规则，真实模型日志待查 |
| 重复点击、跨页并发 | CAS 可修复丢更新/零行假成功；同请求重复消费仍需任务幂等方案 |
| 刷新、退出 | 不会自动撤销已完成的扣次请求，需关联任务/文档和 Dify 记录 |
| 切换登录方式 | 服务端会话 UUID 链路已查；账号合并与历史迁移待确认 |
| 人工补发 | 新增批次，现存购买不覆盖；实际修改记录和人工减少并发待审计 |
| 未到期/到期/NULL | 原过滤语义保持；到期 remaining 留存，模拟验证；生产异常边界待查 |
| 更新/重新部署 | PostgreSQL/Supabase 数据持久；配置/RLS/schema 变化可导致读错，缺部署证据 |

### 历史恢复

- 显示故障：数据库余额仍在则恢复读取，无需补发。
- 已付但缺服务批次：核对用户 UUID、渠道支付/退款、订单 product_id、原始期限、当时产品规则、已有服务批次/credits/人工奖励；按缺失类型计算，不能把 order.credits 与 service_quotas 相加。
- 正常到期：remaining 可帮助确认未用量，但不自动恢复有效期；NULL 有效期需查历史规则，不自动永久有效。
- 失败扣次：只有存在可信原消费、对应失败/未交付证据且未退款/补发时，才能制作候选；现有剩余批次缺少消费流水，可能**无法准确识别应该补回的用户或次数**。
- 历史还原按批次、服务范围、订单时的赠送规则、合法扣减与期限处理。资料不足写“无法确认”，不猜余额。文档数量不等于合法消费次数，修改、失败和未保存会破坏简单公式。
- 数据修复前生成受限 dry-run 清单、备份原记录与输入哈希，按唯一恢复键审计，事务内检查前置状态；复核后另行授权分批执行。回滚采用审计冲正，补回后已使用的次数不能直接删行或写负数。本轮不执行。
- 代码修复无需迁移，可 revert 本次提交；生产发布前应先完成上述端到端方案评审及预发布验证。本地已有 `pnpm-lock.yaml` 用户改动保留，不纳入本次提交。

## F. 本地验证结果（2026-10-11）

修改首先提交为 `795ee66`，随后执行本地验证；没有 push。

| 检查 | 结果 |
| --- | --- |
| `node --test scripts/credit-incident.test.cjs` | 12/12 通过；包括 summary/records 两种失败时次数页面均展示读取失败而非 0 |
| PostgreSQL 只读诊断 SQL | 通过。在独立本地 `aiw_credit_incident_20261011_test` 中建立最小合成表/数据后执行，识别 1 个已购服务为 0、1 个多次购买、1 个人工补发、2 个有效余额账号、1 个旧积分正数但服务为 0、4 次过期未用、1 条 NULL 有效期；这些数字全部是测试夹具，无生产含义 |
| `pnpm build` | 退出码 0，完成生产包；现有配置 `ignoreBuildErrors=true`，不能据此声明类型正确。仍提示缺认证 secret/base URL 及现有代理依赖 undici 缺失 |
| TypeScript | 全量检查未通过。使用同一 tsconfig 和 TypeScript compiler host，以修改前版本覆盖本次 TS/TSX 文件，与当前完整程序对照：基线和当前均 43 条诊断，新增 0，本次改动文件诊断 0；其他页面/导出工具等原有错误保留 |
| `pnpm lint` | 未完成：仓库未设置 ESLint 配置，`next lint` 进入首次配置交互，退出码 1；未为本轮修改全局 lint 配置 |
| 本地浏览器 | 已尝试本地启动，使用测试专用认证配置、loopback Supabase 占位地址及本地合成库，未加载生产凭证。`/zh/my-credits` 与 `/my-credits` 存在现有国际化循环重定向，无法完成登录态浏览器验收；没有触发支付、真实登录或模型调用 |
| 相邻仓库撤销 | essmote / essmote-server 相对各自原基线代码 diff 均为空，误改已通过 revert 撤销；没有推送 |

12 项回归和诊断 SQL 证明本次最小补丁在本地模拟条件下符合预期。回调双写、任务级幂等、生成失败是否应返还及历史数据恢复仍须生产只读证据与业务规则确认。完整上线前应另行完成真实 schema/权限下的预发布集成验证、修复现有本地路由/静态检查阻碍；本轮未上线。
