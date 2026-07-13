# 竞见｜竞品外宣情报工作台

真实数据驱动的留学行业竞品外宣情报系统。支持单条投递、CSV/XLSX 导入、公开网页手动监测、审核入库、附件证据、结构化分析、宣传事件、竞品档案、报告项目，以及内部 AI 不可用时的外部 AI 分析包导出和结果回填。

## 技术架构

- 前端与服务端：Next.js 16 App Router、React 19、TypeScript
- 数据库与对象存储：Supabase PostgreSQL + Private Storage
- 部署：Vercel Production Domain
- AI：OpenAI Responses API（可选）；未配置或失败时保留规则分析和外部 AI 交接能力
- 文件：服务器生成 Markdown、JSON、XLSX、ZIP；旧 DOCX/PPTX 路由继续保留

当前生产地址：<https://jingjian-competitor-intelligence.vercel.app/>

## 本地启动

要求 Node.js 22.13+ 和 pnpm。

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

打开 <http://localhost:3000>。

## 数据库安装与迁移

新项目先在 Supabase SQL Editor 执行：

1. `supabase/schema.sql`
2. `supabase/migrations/202607130001_p0_intelligence_refactor.sql`

已有项目只执行第 2 个 migration。迁移只扩展结构，保留 `competitors`、`discoveries`、`materials`、`material_files`、`reports` 及其旧字段和数据；旧附件、线索和分析会复制到新结构。

Storage 创建私有 Bucket：`competitor-assets`。

## 环境变量

| 变量 | 必需 | 说明 |
|---|---|---|
| `SUPABASE_URL` | 是 | `https://项目ID.supabase.co`，不要附加 `/rest/v1` |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | 只配置在 Vercel 服务端，不得使用 publishable key |
| `SUPABASE_STORAGE_BUCKET` | 否 | 默认 `competitor-assets` |
| `OPENAI_API_KEY` | 否 | 未配置时启用规则分析和外部 AI 包 |
| `OPENAI_MODEL` | 否 | 默认 `gpt-5.6-terra` |

所有需要 service role 的操作只在 Route Handler 中执行，浏览器不持有 Supabase 服务密钥。

## 验证与构建

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

`test` 当前执行一次完整 Next.js 生产构建；仓库另有 HTML 安全回归测试。后续可增加独立 API 集成测试环境。

## Vercel 部署

1. 在 Vercel 导入 GitHub 仓库。
2. Framework Preset 选择 Next.js。
3. Install Command：`pnpm install --frozen-lockfile`。
4. Build Command：`pnpm build`。
5. 配置以上服务端环境变量，并同时应用于 Production。
6. 推送 `main` 后自动更新 Production Deployment，正式域名保持不变。

不要把 Preview Deployment URL 当作正式分享地址。自定义域名在 Vercel `Settings → Domains` 绑定，DNS 验证完成后仍由同一 Production 项目提供服务。

## 免费部署下的监测方式

系统不依赖 Render 或付费定时任务。监测任务保存在 Supabase，用户在“监测任务”页面手动点击“立即运行”，运行日志和发现线索会真实写入数据库。Vercel/Supabase 在线时，电脑关机不会影响其他人访问。

## 数据安全

- `.env*` 默认忽略，仅提交无真实密钥的 `.env.example`。
- Storage 使用私有 Bucket，附件通过短期签名 URL 查看。
- 外部 AI 包会包含所选素材和附件，下载后应按公司数据规范保管。
- 删除素材默认为软删除；原始素材不会因分析导入而被覆盖。

详细改造说明见 [`docs/competitor-intelligence-refactor.md`](docs/competitor-intelligence-refactor.md)。
