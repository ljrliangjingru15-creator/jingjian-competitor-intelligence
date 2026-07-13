import type {SupabaseClient} from "@supabase/supabase-js";
import {emptyAnalysis, type StructuredAnalysis} from "./domain";
import {isMissingSchemaError, normalizeText} from "./data-utils";

const contentTags = ["录取案例","学生故事","顾问人设","产品宣传","活动邀约","政策解读","服务流程","白皮书","合作背书","促销优惠","品牌故事"];
const strategyTags = ["权威背书","结果证明","焦虑驱动","稀缺性","低门槛获客","高端圈层","顾问信任","服务透明","路径教育","本地化服务","情绪共鸣"];

export function rulesAnalysis(material: Record<string, unknown>): StructuredAnalysis {
  const evidence = String(material.evidence_id || "");
  const text = normalizeText([material.title, material.raw_text, material.note, material.focus_points].filter(Boolean).join(" "));
  const result = emptyAnalysis(evidence);
  if (/报告|白皮书|数据/.test(text)) { result.content_tags.push("白皮书"); result.marketing_strategies.push("权威背书"); }
  if (/活动|讲座|直播|私享会|峰会/.test(text)) { result.content_tags.push("活动邀约"); result.facts.activities.push(String(material.title || "活动")); result.marketing_strategies.push("低门槛获客"); }
  if (/录取|offer|名校/i.test(text)) { result.content_tags.push("录取案例"); result.marketing_strategies.push("结果证明"); }
  if (/课程|产品|服务|规划/.test(text)) result.content_tags.push("产品宣传");
  if (/限额|仅限|席位|截止/.test(text)) result.marketing_strategies.push("稀缺性");
  if (/广州|深圳|大湾区|本地/.test(text)) result.marketing_strategies.push("本地化服务");
  if (/私信|咨询|报名|领取|预约|添加/.test(text)) result.facts.ctas.push("内容中存在咨询、报名或资料领取动作（需人工核对原文）");
  result.content_tags = [...new Set(result.content_tags.length ? result.content_tags : ["其他"] )];
  result.marketing_strategies = [...new Set(result.marketing_strategies)];
  result.conversion_path = result.facts.ctas.length ? ["公开内容", "咨询/报名入口", "顾问承接"] : ["公开内容", "转化入口待核实"];
  result.strategy_signals = result.marketing_strategies.map(x => `可能使用${x}策略`);
  result.actions = ["核对原文 CTA 与目标客群", "保留链接、正文和截图作为证据", "样本不足时不外推为机构长期策略"];
  result.confidence = 0.3;
  return result;
}

export function classifyAiError(status: number, payload: unknown) {
  const text = JSON.stringify(payload).toLowerCase();
  if (status === 429 || /quota|billing|insufficient_quota/.test(text)) return "quota_exceeded";
  if (/context_length|token.*limit|too many tokens/.test(text)) return "token_limit";
  if (status === 408 || status === 504 || /timeout/.test(text)) return "timeout";
  if (status === 401 || status === 403 || /country|region|territory not supported|model.*not found/.test(text)) return "model_unavailable";
  if (status === 400 || /json|schema|invalid/.test(text)) return "invalid_response";
  return "unknown_error";
}

function extractResponseText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const content = Array.isArray((item as {content?: unknown[]}).content) ? (item as {content: unknown[]}).content : [];
    return content.map(part => part && typeof part === "object" && "text" in part ? String((part as {text: unknown}).text) : "");
  }).join("");
}

function coerceAnalysis(value: unknown, evidence: string): StructuredAnalysis {
  const base = emptyAnalysis(evidence);
  if (!value || typeof value !== "object") return base;
  const v = value as Record<string, unknown>;
  const arrays = (key: string) => Array.isArray(v[key]) ? (v[key] as unknown[]).map(String).filter(Boolean) : [];
  const facts = v.facts && typeof v.facts === "object" ? v.facts as Record<string, unknown> : {};
  const factArr = (key: string) => Array.isArray(facts[key]) ? (facts[key] as unknown[]).map(String).filter(Boolean) : [];
  return {
    facts: {products:factArr("products"),activities:factArr("activities"),prices:factArr("prices"),offers:factArr("offers"),audiences:factArr("audiences"),regions:factArr("regions"),results:factArr("results"),people:factArr("people"),ctas:factArr("ctas"),promises:factArr("promises")},
    content_tags: arrays("content_tags").filter(x => contentTags.includes(x) || x === "其他"),
    marketing_strategies: arrays("marketing_strategies").filter(x => strategyTags.includes(x)),
    target_audiences: arrays("target_audiences"), conversion_path: arrays("conversion_path"), strategy_signals: arrays("strategy_signals"), actions: arrays("actions"),
    evidence_ids: [...new Set([evidence, ...arrays("evidence_ids")].filter(Boolean))],
    confidence: Math.max(0, Math.min(1, Number(v.confidence) || 0.5)),
  };
}

async function saveVersion(sb: SupabaseClient, materialId: string, source: string, analysis: StructuredAnalysis, meta: {model?: string; promptVersion?: string; status?: string; errorCode?: string; errorMessage?: string}) {
  const upsert = await sb.from("analysis_results").upsert({material_id:materialId,source,status:meta.status || "completed"},{onConflict:"material_id,source"}).select("id,current_version").single();
  if (upsert.error) {
    if (isMissingSchemaError(upsert.error)) return null;
    throw upsert.error;
  }
  const version = Number(upsert.data.current_version || 0) + 1;
  const created = await sb.from("analysis_versions").insert({analysis_result_id:upsert.data.id,version,model_name:meta.model,prompt_version:meta.promptVersion,structured_data:analysis,facts:analysis.facts,inferences:{content_tags:analysis.content_tags,marketing_strategies:analysis.marketing_strategies,target_audiences:analysis.target_audiences,conversion_path:analysis.conversion_path,strategy_signals:analysis.strategy_signals},actions:{items:analysis.actions},confidence:analysis.confidence,status:meta.status || "completed",error_code:meta.errorCode,error_message:meta.errorMessage,human_review_status:"pending"}).select("id").single();
  if (created.error) throw created.error;
  await sb.from("analysis_results").update({current_version:version,status:meta.status || "completed"}).eq("id",upsert.data.id);
  if (analysis.evidence_ids.length) await sb.from("analysis_evidence").insert(analysis.evidence_ids.map(evidence => ({analysis_version_id:created.data.id,material_id:materialId,evidence_id:evidence})));
  return {resultId:upsert.data.id,versionId:created.data.id,version};
}

export async function analyzeMaterial(sb: SupabaseClient, material: Record<string, unknown>) {
  const materialId = String(material.id), evidence = String(material.evidence_id || "");
  await sb.from("materials").update({analysis_status:"processing"}).eq("id",materialId);
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
  const promptVersion = "competitor-analysis-v2";
  let aiAnalysis: StructuredAnalysis | null = null, errorCode: string | undefined, errorMessage: string | undefined;
  if (!key) { errorCode = "configuration_missing"; errorMessage = "未配置 OPENAI_API_KEY"; }
  else {
    const prompt = `你是留学行业竞品营销分析师。仅依据给定素材，输出一个JSON对象，不要Markdown。事实不得混入推断，样本不足必须留空。\n字段：facts(products,activities,prices,offers,audiences,regions,results,people,ctas,promises)，content_tags，marketing_strategies，target_audiences，conversion_path，strategy_signals，actions，evidence_ids，confidence(0-1)。\n允许内容标签：${contentTags.join("、")}、其他。允许营销策略：${strategyTags.join("、")}。\n证据编号：${evidence}\n机构：${material.competitors && typeof material.competitors === "object" ? (material.competitors as {name?:string}).name : material.original_organization || "未知"}\n标题：${material.title || ""}\n平台：${material.platform || ""}\n原文：${material.raw_text || ""}\n备注：${material.note || ""}\n关注重点：${material.focus_points || ""}`;
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({model,input:prompt})});
      const payload = await response.json() as Record<string, unknown>;
      if (!response.ok) { errorCode = classifyAiError(response.status, payload); errorMessage = JSON.stringify(payload).slice(0, 2000); }
      else {
        try { aiAnalysis = coerceAnalysis(JSON.parse(extractResponseText(payload)), evidence); }
        catch (error) { errorCode = "invalid_response"; errorMessage = error instanceof Error ? error.message : "无法解析模型响应"; }
      }
    } catch (error) { errorCode = error instanceof DOMException && error.name === "TimeoutError" ? "timeout" : "unknown_error"; errorMessage = error instanceof Error ? error.message : "AI调用失败"; }
  }
  if (aiAnalysis) {
    const version = await saveVersion(sb, materialId, "internal_ai", aiAnalysis, {model,promptVersion});
    const updated = await sb.from("materials").update({analysis:aiAnalysis,status:"已分析",analysis_status:"completed",human_review_status:"pending"}).eq("id",materialId);
    if (updated.error && isMissingSchemaError(updated.error)) await sb.from("materials").update({analysis:aiAnalysis,status:"已分析"}).eq("id",materialId);
    else if (updated.error) throw updated.error;
    return {analysis:aiAnalysis,mode:"ai",model,version};
  }
  const basic = rulesAnalysis(material);
  await saveVersion(sb, materialId, "internal_ai", emptyAnalysis(evidence), {model,promptVersion,status:"failed",errorCode,errorMessage});
  const rulesVersion = await saveVersion(sb, materialId, "rules", basic, {model:"rule-engine-v1",promptVersion:"rules-v1"});
  const materialStatus = errorCode === "quota_exceeded" ? "quota_exceeded" : errorCode === "configuration_missing" || errorCode === "model_unavailable" ? "model_unavailable" : "failed";
  const update = await sb.from("materials").update({analysis:basic,status:"基础分析",analysis_status:materialStatus,human_review_status:"pending"}).eq("id",materialId);
  if (update.error && isMissingSchemaError(update.error)) await sb.from("materials").update({analysis:basic,status:"基础分析"}).eq("id",materialId);
  return {analysis:basic,mode:"rules",errorCode,errorMessage,version:rulesVersion};
}
