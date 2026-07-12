# 竞见｜留学竞品外宣情报工作台

## 架构
React 19、TypeScript、Next.js App Router界面；当前由Vinext/Vite构建，API为TypeScript Route Handlers，数据与文件原型使用Cloudflare D1/R2，AI使用OpenAI Responses API，DOCX/PPTX在服务器生成。

## 生产目标
前端部署Vercel，Node API与定时任务部署Render，PostgreSQL与私有文件存储使用Supabase。生产环境不得依赖本机或localhost。

## 本地开发
`pnpm install && pnpm dev`；构建：`pnpm build`。

## 环境变量
Vercel：`NEXT_PUBLIC_API_BASE_URL`、`NEXT_PUBLIC_SITE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`。

Render：`WEB_ORIGIN`、`OPENAI_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_STORAGE_BUCKET`、`CRON_SECRET`。真实密钥不得提交Git。

## 部署
1. Supabase执行`supabase/schema.sql`并创建私有Bucket `competitor-assets`。
2. GitHub创建私有仓库并推送。
3. Render连接仓库，按`render.yaml`创建API和Cron并配置Secret。
4. Vercel导入仓库，使用Next.js预设，配置公开环境变量。
5. 将Vercel Production Domain填入Render `WEB_ORIGIN`。

## 更新与域名
推送默认分支后Vercel和Render自动部署，Production Domain不变。Vercel Settings→Domains可绑定`intel.company.com`；Render可绑定`api-intel.company.com`，之后更新`WEB_ORIGIN`和API Base URL。

## 常见问题
- 子页面刷新404：必须使用Next.js预设，不能静态导出。
- CORS：`WEB_ORIGIN`须与浏览器Origin完全一致。
- 上传失败：检查Bucket、Service Role、20MB限制与MIME。
- AI 401/429：检查OpenAI密钥、余额和限流。
- 报告超时：交给Render后台任务生成。
- 下载失效：使用Supabase短期签名URL。
