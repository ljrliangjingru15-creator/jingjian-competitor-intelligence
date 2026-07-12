# 竞见｜留学竞品外宣情报工作台

## 架构
React 19、TypeScript、Next.js App Router界面；当前由Vinext/Vite构建，API为TypeScript Route Handlers，数据与文件原型使用Cloudflare D1/R2，AI使用OpenAI Responses API，DOCX/PPTX在服务器生成。

## 生产架构
页面与手动触发API统一部署在Vercel免费版，PostgreSQL与私有文件存储使用Supabase免费版。没有Render和定时任务依赖；搜索、AI分析与报告生成均由用户在页面手动触发。

## 本地开发
`pnpm install && pnpm dev`；构建：`pnpm build`。

## 环境变量
Vercel：`OPENAI_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_STORAGE_BUCKET`。真实密钥不得提交Git，Service Role Key只能配置为服务端环境变量。

## 部署
1. Supabase执行`supabase/schema.sql`并创建私有Bucket `competitor-assets`。
2. GitHub创建私有仓库并推送。
3. Vercel导入仓库，使用Next.js预设并配置环境变量。
4. 部署Production后验证上传、审核、手动搜索、AI分析和报告下载。

## 更新与域名
推送默认分支后Vercel自动部署，Production Domain不变。Vercel Settings→Domains可绑定`intel.company.com`。

## 常见问题
- 子页面刷新404：必须使用Next.js预设，不能静态导出。
- 上传失败：检查Bucket、Service Role、20MB限制与MIME。
- AI 401/429：检查OpenAI密钥、余额和限流。
- 报告超时：缩小单次报告数据量，分批生成重点机构。
- 下载失效：使用Supabase短期签名URL。
