import assert from "node:assert/strict";
import {readFile,access} from "node:fs/promises";
import test from "node:test";

const root=new URL("../",import.meta.url);
const read=path=>readFile(new URL(path,root),"utf8");

test("production overview has no seed dataset or fabricated KPI additions",async()=>{
  const page=await read("app/page.tsx");
  assert.doesNotMatch(page,/const\s+seed\b/);
  assert.doesNotMatch(page,/items\.length\s*\+\s*20|已完成分析.*\+\s*15/);
  assert.match(page,/\/api\/dashboard/);
  assert.match(page,/预览并查重/);
});

test("service role key stays in server-only modules",async()=>{
  const [admin,home,materials]=await Promise.all([read("lib/supabase-admin.ts"),read("app/page.tsx"),read("app/materials/page.tsx")]);
  assert.match(admin,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(home,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
  assert.doesNotMatch(materials,/SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});

test("P0 migration covers state, evidence, import, report, and external AI entities",async()=>{
  const migration=await read("supabase/migrations/202607130001_p0_intelligence_refactor.sql");
  for(const token of ["collection_status","review_status","analysis_status","human_review_status","report_status","competitor_aliases","raw_leads","material_assets","marketing_events","analysis_versions","analysis_evidence","report_projects","import_jobs","external_ai_packages","external_ai_imports","audit_logs"]){assert.match(migration,new RegExp(token))}
  assert.match(migration,/EVD-/);
  assert.match(migration,/on conflict\(legacy_discovery_id\) do nothing/);
});

test("external AI package contains required handoff artifacts",async()=>{
  const route=await read("app/api/external-ai/export/route.ts");
  for(const file of ["README.md","AI分析任务指令.md","素材明细.xlsx","素材明细.md","素材数据.json","机构背景资料.md","已有分析结果.xlsx","外部AI分析回填模板.xlsx","证据索引.xlsx"]){assert.match(route,new RegExp(file.replace(".","\\.")))}
  assert.match(route,/assets\//);
});

test("all P0 application routes exist",async()=>{
  const paths=["app/materials/page.tsx","app/review/page.tsx","app/monitoring/page.tsx","app/competitors/page.tsx","app/analysis/page.tsx","app/reports/page.tsx","app/imports/page.tsx","app/settings/page.tsx"];
  await Promise.all(paths.map(path=>access(new URL(path,root))));
});

