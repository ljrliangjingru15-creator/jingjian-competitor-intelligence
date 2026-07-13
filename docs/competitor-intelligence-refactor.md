# 竞对外宣监测工作台：系统级改造记录

更新时间：2026-07-13

## 1. 当前架构

### 应用

- Next.js 16.2.6 App Router，React 19.2.6，TypeScript 5.9。
- 页面和 API Route Handler 同仓库部署至 Vercel；没有 Render 依赖。
- `lib/supabase-admin.ts` 在服务端创建 Supabase Admin 客户端，service role 不进入客户端 bundle。
- Supabase PostgreSQL 保存业务数据；私有 Storage Bucket `competitor-assets` 保存截图、PDF、报告和外部 AI ZIP。
- OpenAI Responses API 用于手动监测和结构化素材分析。`OPENAI_API_KEY` 可选；失败时不会阻塞归档和导出。
- 旧 Cloudflare/Vinext/D1 原型仍保留在 `worker/`、`db/`、`drizzle/`，已从 Next.js TypeScript 构建范围排除，不是当前生产数据源。

### 生产部署

- Production Domain：`https://jingjian-competitor-intelligence.vercel.app/`
- `vercel.json` 使用 Next.js 构建和 `iad1` Function Region。
- GitHub 仓库：`ljrliangjingru15-creator/jingjian-competitor-intelligence`。

## 2. 审计发现的问题

1. 首页初始使用 `seed` 数组，KPI 在真实数量上额外 `+20 / +15`，监测线索、运行状态和趋势数字是硬编码。
2. 竞品洞察页使用整页静态机构画像、固定素材数、固定趋势和固定策略文本，与数据库不一致。
3. 旧数据库只有 `competitors / monitor_tasks / discoveries / materials / material_files / reports` 六类基础表。
4. `materials.status` 同时承担采集、审核、分析和报告状态，无法可靠筛选和统计。
5. 自动监测接口只返回 OpenAI 原始响应，不建立运行日志，也不把结果写入审核线索。
6. 审核只支持入库/忽略，缺少修改、合并素材、合并/创建宣传事件和审计记录。
7. 附件可真实上传，但只有旧 `material_files`，缺少顺序、主图、软删除和统一证据详情。
8. AI 分析只把自由 JSON 写回 `materials.analysis`，没有模型、Prompt、错误、人工复核和历史版本。
9. 报告生成路由能生成 DOCX/PPTX，但没有报告项目、选材范围、质量检查或版本。
10. 没有 CSV/XLSX 导入、分行错误、任务记录、别名映射、标准化 URL/正文哈希查重。
11. OpenAI 额度/地区错误此前只能显示失败；虽有规则降级，但没有外部 AI 交接与回填闭环。
12. 仓库同时存在 npm 与 pnpm 锁文件，npm lock 已落后于实际 Next.js 生产依赖，存在部署歧义。

## 3. 本轮实施范围

### P0-1：统一真实数据源

- 首页 KPI 由 `/api/dashboard` 聚合 Supabase；不再包含演示加数或静态趋势。
- 统一导航：总览、素材库、审核箱、监测任务、竞品档案、分析中心、报告中心、导入导出、系统设置。
- 旧表仍可兼容读取；完整功能通过 migration 启用。

### P0-2：主数据、投递、导入、审核、事件

- 机构主数据支持英文名、别名、区域/校区、类型、总部、重点市场、重点竞品和监测开关。
- 单条投递增加“预览并查重”，展示机构映射、平台、时间、原文、建议标签、置信度和重复结果；用户可修正后入库。
- 多附件归属同一素材，保存顺序和主图标记。
- CSV/XLSX 批量导入支持字段自动映射、人工重映射、逐行校验、别名匹配、查重、跳过/合并/独立导入、错误行 CSV 和导入批次。
- 审核箱支持修改后入库、忽略、合并素材、合并事件、创建事件，并保留线索与审计。
- 素材库支持状态/机构/平台筛选、详情、批量状态、重新分析、加入报告、软删除、事件视图和外部 AI 包。

### P0-3：结构化分析、版本与证据

- 分析结构拆分为事实、内容标签、营销策略、客群、转化路径、策略信号、行动建议和证据编号。
- `analysis_results` 记录来源，`analysis_versions` 保存模型、Prompt、置信度、状态、错误和人工复核历史。
- `analysis_evidence` 将分析版本与稳定 `EVD-...` 证据编号关联。
- 错误码统一：`configuration_missing / model_unavailable / quota_exceeded / token_limit / timeout / invalid_response / unknown_error`。
- 内部 AI 不可用时保留规则分析，同时把素材状态标为失败原因，允许重试或转外部 AI。

### P0-4：外部 AI 分析包与回填

- 任意素材范围可生成 ZIP，不依赖 OpenAI。
- ZIP 包含 README、任务指令、XLSX/Markdown/JSON 素材、机构背景、已有分析、回填模板、证据索引和已入库附件。
- Excel/JSON 回填按素材编号或证据编号匹配；默认两个版本并存，不覆盖原始素材。
- 回填返回匹配、未匹配、新增、冲突和错误数量，并记录导入任务。

### P0-5：报告项目与竞品档案

- 报告项目保存名称、周期、素材范围、复核要求、状态和版本。
- 结构化草稿先做数据质量与证据范围整理；可导出 Markdown、JSON、Excel，或转外部 AI 包。
- 竞品档案从真实素材聚合业务方向、主题、客群、平台、营销策略、近期动作和证据。
- 趋势按“近30天 vs 此前60天月均”计算；有效样本少于4条显示“数据不足”。

## 4. 数据库迁移说明

迁移文件：`supabase/migrations/202607130001_p0_intelligence_refactor.sql`

### 扩展旧表

- `competitors`：主数据、监测开关、更新时间、软删除。
- `monitor_tasks`：名称、运行状态、更新时间、软删除。
- `materials`：证据编号、原始机构/正文/账号/时间、分类数组、采集/审核/分析/复核/报告五组状态、URL 标准化、正文哈希、重复指向、导入批次、更新时间和软删除。

### 新增实体

`competitor_aliases`、`monitoring_runs`、`raw_leads`、`material_assets`、`marketing_events`、`material_event_links`、`analysis_results`、`analysis_versions`、`analysis_evidence`、`competitor_profiles`、`report_projects`、`report_sections`、`report_material_links`、`import_jobs`、`import_job_rows`、`export_jobs`、`external_ai_packages`、`external_ai_imports`、`prompt_templates`、`taxonomy`、`audit_logs`、`system_settings`。

### 旧数据迁移

- 为旧素材生成稳定 `EVD-` 证据编号。
- 根据旧 `status` 回填分析状态。
- `material_files` 复制到 `material_assets`，旧表保留。
- `discoveries` 复制到 `raw_leads`，旧表保留。
- `materials.analysis` 复制为 `legacy` 分析版本，原 JSON 保留。
- 新表启用 RLS，仅授予 `service_role` 业务权限；所有敏感写入仍经服务端 API。

## 5. 页面改造说明

| 页面 | 真实数据与功能 |
|---|---|
| `/` | 数据库 KPI、投递预览、查重、附件、归档/分析、最近素材与线索、外部 AI 包 |
| `/materials` | 真实素材/事件、筛选、批量操作、详情、原链、截图、分析版本 |
| `/review` | 线索主从审核、修改、忽略、素材/事件合并、事件创建 |
| `/monitoring` | 真实任务、手动运行、运行日志、错误降级 |
| `/competitors` | 主数据维护、别名、真实聚合画像、可解释趋势、证据入口 |
| `/analysis` | 分析状态、版本、错误、复核、重试、外部 AI 包 |
| `/reports` | 报告项目、素材范围、质量草稿、Markdown/JSON/XLSX、外部 AI |
| `/imports` | CSV/XLSX 导入预览、字段映射、分行结果、外部结果回填 |
| `/settings` | 健康检查、迁移提示、非敏感设置、环境变量清单 |

## 6. 兼容性说明

- 旧路由 `/api/materials`、`/api/uploads`、`/api/analyze`、`/api/discoveries`、`/api/reports/generate` 保留。
- 核心读取在检测到新表/字段不存在时回退到旧表；新 P0 功能需要执行 migration。
- 旧 `status` 与 `analysis` 继续写入，供旧代码和历史报告读取；新页面以拆分状态和分析版本为准。
- DOCX/PPTX 旧报告路由保留，但正式报告项目首选 Markdown/JSON/XLSX，避免把静态假文件当作报告成功。
- `worker/`、`db/`、`drizzle/` 作为历史原型保留并隔离，未擅自删除。
- 删除了过时的 `package-lock.json`，项目以已配置的 `pnpm-lock.yaml` 为唯一部署锁文件。

## 7. 外部 AI ZIP 结构

```text
竞对外宣分析包_YYYYMMDDHHmm/
├── README.md
├── AI分析任务指令.md
├── 素材明细.xlsx
├── 素材明细.md
├── 素材数据.json
├── 机构背景资料.md
├── 已有分析结果.xlsx
├── 外部AI分析回填模板.xlsx
├── 证据索引.xlsx
└── assets/机构/证据编号/附件
```

同步请求最多读取 1,000 条素材，并将附件包控制在约 80MB；更大范围应按机构、时间或批次拆分。

## 8. 验证结果

- TypeScript：`tsc --noEmit` 已通过。
- ESLint：全仓检查已通过（排除构建产物目录）。
- Node tests：5/5 通过，覆盖真实数据首页、密钥隔离、P0 migration、外部 AI 包文件和页面路由。
- Next.js production build：使用 webpack 构建通过，30 个页面/API 路由完成编译、类型检查和静态生成。`package.json` 已固定 `next build --webpack`；Turbopack 在当前受限本地沙箱因无法绑定内部端口而报环境错误，Vercel 生产构建不会再走该路径。
- 真实 Supabase 流程需要先执行 migration，再在生产环境完成投递、导入、审核、分析、ZIP 和回填验收。

## 9. 尚未完成的后续项目

1. 用户登录、组织隔离和基于用户身份的 RLS；当前仍是单组织、服务端可信工作台。
2. 大型 ZIP 的异步队列、进度轮询和断点续传；P0 使用有反馈的同步生成并设置容量边界。
3. 高级语义相似度/向量去重；P0 使用标准化 URL、机构+标题、正文 SHA-256 和人工合并。
4. 自动抓取社交平台正文与 OCR；P0 明确允许人工修正，不伪造抓取成功。
5. DOCX/PDF/PPTX 与公司模板的报告项目级生成；旧基础生成器保留，P0 先保证可审计数据闭环。
6. 定时任务；免费部署模式继续使用手动监测。未来可选 Vercel Cron、Supabase Cron 或独立队列。
7. 完整 E2E 自动化测试和专用 staging Supabase；当前仓库没有可安全写入的测试数据库凭证。
