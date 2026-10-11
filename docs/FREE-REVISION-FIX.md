# 免费全文优化与离开提醒修复记录

## 普通网页验收步骤

以下步骤适用于 **PS、SOP、Cover Letter、推荐信，各做一遍**。使用测试账号及测试次数；代码推送不代表已经上线。先由工程师在测试环境执行本次迁移，才能验收新规则。

### 1. 生成、查看与取消优化

1. 登录，打开「我的次数」，记录对应服务的次数。
2. 从创作中心正常生成一篇文书，等待正文保存完成。
3. 检查正文旁已没有单独的段落重写入口。
4. 点原有「免费优化一次」，应打开原有提示与全文优化设置，字段、按钮保持原样。
5. 取消设置，回到文书；免费机会仍可打开。查看次数：只应扣正常初稿的一次，打开/取消优化不扣次。

### 2. 取消离开与使用免费优化

1. 在尚未优化的成稿页点「← 返回创作中心」。应弹出「确定要离开当前文书吗？」。
2. 点关闭或按 Esc：留在当前成稿，机会仍在。
3. 再点返回，然后点「使用免费优化」：留在成稿，直接打开原有全文优化设置；不会自动开始生成。
4. 取消设置，分别点 Logo、首页、创作中心、我的文档等站内出口：应出现同一离开提醒，取消后留页。
5. 从站内进入成稿后点浏览器返回：应提示；取消后历史中的原页面仍在，后续返回不会多出人为插入的空白历史项。
6. 复制、下载、版本查看、页内锚点和新标签页打开不应弹出此提醒。

### 3. 确认离开会放弃本篇机会

1. 另生成一篇尚未优化且已保存的测试文书，保留其链接。
2. 点任意站内出口，选「我已了解，直接离开」。保存成功后才跳到刚才选择的目的地。
3. 回到「我的文档」：正文仍在，仍可查看、复制和下载。
4. 重开成稿链接、刷新，或用另一标签页打开同一篇：无法再次免费优化。
5. 另一篇未放弃的文书不受影响；购买次数不因离开减少。
6. 测试环境模拟保存失败时：应留在原页并提示「未能保存放弃状态」，不能跳走。（普通用户无需人为制造断网；由工程师准备故障环境。）

### 4. 完整全文优化与版本查看

1. 另用一篇未放弃的文书，按原有设置提交一次免费全文优化。
2. 等待结果，确认原稿和优化稿同时保留。
3. 打开原有对比窗口、切换版本、复制及下载，检查内容与原有操作一致。
4. 对应付费次数不应再次减少；再次优化被拦截。
5. 已用过免费优化后返回创作中心：不再提示放弃机会。

**现有源码边界：**四类 `VersionComparison` 负责版本选择和对照查看，没有找到独立“确认最终版并持久化”的接口或确认弹窗；「我的文档」另有现存“恢复版本”确认弹窗与保存路径，本次均兼容保留。本次保留当前版本切换、复制、下载及对比行为，没有新增或改造最终选版业务。不能把版本切换宣称为已验证的最终版持久化。

## 影响分析与依赖（修改前核查结果）

| 类型 | 独立段落路径 | 全文优化路径 | 版本路径 |
| --- | --- | --- | --- |
| PS | PSResultClient → ParagraphRevision → useDifyRevisePS.runRevision → revise-personal-statement，原先扣 PS/SOP 次数 | 原有 RevisionModal → FullRevisionModal → runRevisionStreaming → workflows/run，whole=0 | documents/:uuid/revisions 保存新稿，versions 查询；VersionComparison 原样保留 |
| SOP | SOPResultClient → ParagraphRevision → createParagraphRevisionHandler → revise-sop，原先 AI 成功后扣次，存在初稿工作流回退 | 同上，使用 revise-sop 工作流 | 同上 |
| CL | CoverLetterResultClient → ParagraphRevision → revise-cover-letter，原先先扣 CL 次数 | 同上，使用 revise-cover-letter 工作流 | 同上 |
| RL | RecommendationLetterResultClient → ParagraphRevision → revise-recommendation-letter，原来对应路由缺失；旧 useDifyRevise → revise 曾扣 RL 次数，无当前页面调用者 | 同上，使用 revise-recommendation-letter 工作流 | 同上 |

修改前免费状态只统计 revised 版本数量。先查再写存在竞争；没有放弃状态。全局导航多数是链接，创作中心是 router.push 按钮；四类原有“返回编辑”使用 location.href，均纳入明确的导航请求。默认布局追踪站内历史序号，保留 Next 历史状态，不添加假历史条目。

四套修改 API Key / Dify 工作流被全文优化复用，**全部保留**；`src/services/dify.ts`、Prompt、模型参数及云端配置均未改。只停用网站端的段落专用入口。SOP 专用段落路由中的初稿工作流回退随该路由停用；正常 SOP 初稿和全文优化的原有路径不受此回退清理影响。

## 实际修改文件与原因

- 四个 `src/app/[locale]/(default)/{personal-statement,sop,cover-letter,recommendation-letter}/result/[uuid]/components/*ResultClient.tsx`：移除段落组件与专用处理器；接入离开提醒；全文请求附文书 ID/请求令牌，保存稿件附同一令牌；读取服务端资格是否可用。
- `src/hooks/useDifyRevise{PS,SOP,CoverLetter,RecommendationLetter}.ts`：仅新增传输元数据类型。原有流式回调保持不变；不再有页面调用这些 Hook 的独立段落方法。
- `src/app/api/dify/{revise,revise-personal-statement,revise-sop,revise-cover-letter,revise-recommendation-letter}/route.ts`：统一返回 410，不加载额度或 AI 服务。缺失的 RL 路由也显式停用。
- `src/models/service-quota.ts`：去掉四种 revise 类型的付费映射，旧页面直接请求 deduct-quota 也不能扣修改次数。原有初稿映射、扣次算法均未改。
- `src/app/api/dify/workflows/run/route.ts`：仅四种 revise 类型新增身份、归属、文书类型、全文模式、一次资格校验；在调用 AI 前原子占用资格；转发前移除传输元数据，Dify inputs 与原来相同。不调用付费扣次函数。
- `src/lib/free-revision-stream.ts`：逐行观察完成事件，在成功事件转发给浏览器前确认可保存状态；原始 SSE 字节保持不变。
- `src/models/free-revision.ts`：统一服务端资格 RPC。
- `src/app/api/documents/[uuid]/revisions/route.ts`：资格查询失败不视作未使用；优化稿保存与标记已使用同事务完成，按令牌幂等，不覆盖原稿。为我的文档“恢复版本”保留独立分支，服务端只复制本人本篇已有正文，沿用原有一次修订上限；未改恢复弹窗或前端处理函数。其他文书类型保留旧查询/保存路径。
- `src/app/api/documents/[uuid]/free-revision/route.ts`：当前用户查询或明确放弃本篇资格。
- `src/components/result-leave-guard.tsx`：新增独立提醒、保存成功后续航、失败留页；使用免费优化只打开已有设置，不发 AI 请求。
- `src/lib/result-navigation.ts`、`src/components/blocks/header/index.tsx`：使创作中心按钮及成稿页返回编辑按钮经过同一离开检查。
- `src/components/document-history-tracker.tsx`、默认 `layout.tsx`：记录历史位置；在原有路由监听之前处理可追踪的站内返回，支持取消并恢复当前位置；页内锚点不触发放弃。
- `sql/migrations/20261012-free-revision*.sql`：资格迁移和回滚脚本。
- `scripts/free-revision.test.cjs`、`scripts/fixtures/free-revision.sql`：本地数据库、流与接口模拟和冻结区差异检查。
- 本文件：普通网页验收、影响分析、实测结果和上线边界。

保留没有当前页面调用的旧 Hook / ParagraphRevision 源文件，避免扩大删除范围；对应服务器端接口和付费映射已停用，不存在可继续扣次的旧入口。未删除云端 Dify 项目、Prompt、密钥或配置；后续清理须单独审核复用关系。

## 状态、迁移、历史兼容与回滚

新表 `document_free_revisions` 以原稿 ID 为唯一键，记录用户 ID、state、请求 token、优化稿 ID 与更新时间。无记录且无历史优化稿＝未使用；存在历史优化稿＝已使用。历史记录不回填、不批量放弃。服务端将子版本统一归到原稿，按原稿行锁串行处理资格变化。

- `claim`：仅已保存、未使用、未放弃的四类正文可占用，成为 running。不同标签页只允许一项请求成功。
- AI 明确成功：running → ready；AI 明确失败事件/HTTP 失败：释放 running，允许重试，不消耗付费次数。
- `save`：仅匹配请求 token 的 ready 可保存，插入优化稿并原子标记 used；同 token 重试返回原先的优化稿，不重复建版本。
- `abandon`：仅明确点击直接离开、当前用户原稿确实已保存且 unused 时持久化 abandoned；进行中/已优化不能被覆盖为放弃。重复放弃已放弃稿件是幂等成功。
- 刷新、多标签页和直接请求无法绕过已确认的 abandoned；不删除或覆盖原稿、不修改其他文书、不写付费次数。
- 表启用 RLS，无浏览器侧写权限；RPC 仅允许 service_role 执行。页面身份由服务端会话提供，不接受客户端指定用户。

**上线前工程师事项：**先核对真实 documents 表结构、Supabase service role 配置，在测试环境执行迁移并逐项网页验收，再安排发布；本次未执行生产迁移。代码缺迁移时资格接口失败关闭，不会返回可用或假装放弃成功。

**回滚：**先回滚应用代码，导出资格表保留已放弃记录，再决定是否执行 rollback SQL。直接删表会丢失已放弃/进行中状态并重新开放未保存优化稿的权益，不能无备份执行。回滚不删除 documents 中的原稿或优化稿。

**不确定运行边界：**网络断开、服务器中断或缺少 AI 终态不能证明失败，因此保留 running/ready 待核对，不自动重开资格，也不视作放弃。成功后保存失败时不得再次生成来重试；同令牌可重试保存。当前已有页面没有新增恢复入口，遇到无法确认的任务需工程师核对工作流与版本记录后处理。没有批量补偿或自动恢复任务。

**导航边界：**站内同标签页链接、明确返回按钮与可追踪站内历史返回支持自定义提醒；复制、下载、对比、版本切换、页内锚点与新标签页不拦截。刷新/关页/跨文档历史仅可能有浏览器原生提醒（受浏览器规则和用户交互限制），原生确认不会提交放弃。进入本应用前已有且无序号的历史无法保证自定义提醒；不伪造历史项、不依赖卸载回调取消资格。断网和浏览器崩溃不保证提醒或提交。

## 本地验证结果（2026-10-12）

| 检查 | 结果 |
| --- | --- |
| 四类文书资格/放弃/并发保存/历史兼容/权限隔离 | 成功，本机独立 PostgreSQL 测试库 |
| 20 项关键测试 | 成功：`node --test scripts/free-revision.test.cjs` |
| 四类全文接口模拟 | 成功：全文 Dify inputs 保持一致；身份、归属和资格拦截生效；段落模式 410；未调用额度依赖 |
| 原稿/优化稿同时保存、同令牌幂等 | 成功，本地事务测试 |
| 原有全文优化函数、版本处理器与三类原有弹窗/对比组件、我的文档恢复 UI | 成功，逐类与 17ec185 字符串/源码对照；全文处理函数仅增加传输元数据 |
| 离开 → 原有 PS 全文设置、取消设置、Esc/关闭、失败留页、确认后返回 | 成功，本地浏览器隔离组件页，资格与保存响应使用 mock |
| 浏览器返回、页内锚点及锚点返回 | 成功，本地浏览器点击复验；修复了监听顺序问题 |
| Production Build | 成功；项目配置仍忽略 TS 报错，不能用构建成功代替类型检查 |
| TypeScript | 项目整体未通过；与 17ec185 对照均 43 项既有错误，无新增 |
| Lint | 未通过：项目无 ESLint 配置，pnpm lint 进入首次配置提示并退出；未改全局 lint 规则 |
| 迁移与回滚 | 成功，本地独立测试库；回滚后资格表移除、documents 保留 |
| 四类完整真实生成 → 优化 → 对比 → 下载 | 未实测，需要 Dify 和测试 Supabase 环境 |
| 真实支付、生产账号、线上页面 | 未实测；未操作 |
| CV、购买、有效期、邀请、原有初稿扣次规则 | 无相关代码修改；完整网页回归未实测 |

本地库仅使用合成测试文书与次数。迁移 fixture 不是生产 schema 的证明。测试准备（仅本机空白测试库）见 scripts/fixtures/free-revision.sql，固定库名 aiw_free_revision_20261012_test；测试脚本不读取应用 .env 或生产连接串。

此前三个提交以反向提交撤回：608360c、35256a8、6d2740d。用户原有 pnpm-lock.yaml 修改保留，不纳入修复提交。

**未部署生产、未修改线上用户次数、未自动补偿历史额度。** 本修复解释并停用了具体异常扣次路径，不能据此宣称所有历史次数消失均已还原。
