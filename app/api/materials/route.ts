import {getSupabaseAdmin, describeSupabaseError} from "../../../lib/supabase-admin";
import {createMaterial, findDuplicates, recordAudit} from "../../../lib/repository";
import {isMissingSchemaError} from "../../../lib/data-utils";

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams, sb = getSupabaseAdmin();
    let query = sb.from("materials").select("*,competitors(name),material_assets(*)").is("deleted_at", null).order("created_at", {ascending:false}).limit(Math.min(500, Number(params.get("limit")) || 200));
    const filters: Array<[string,string | null]> = [["competitor_id",params.get("competitor")],["platform",params.get("platform")],["review_status",params.get("reviewStatus")],["analysis_status",params.get("analysisStatus")],["human_review_status",params.get("humanReviewStatus")],["report_status",params.get("reportStatus")],["import_job_id",params.get("importJob")]];
    filters.forEach(([column,value]) => { if (value) query = query.eq(column,value); });
    if (params.get("from")) query = query.gte("created_at", params.get("from")!);
    if (params.get("to")) query = query.lte("created_at", params.get("to")!);
    if (params.get("q")) query = query.or(`title.ilike.%${params.get("q")}%,raw_text.ilike.%${params.get("q")}%`);
    let result = await query;
    if (result.error && isMissingSchemaError(result.error)) result = await sb.from("materials").select("*,competitors(name),material_files(*)").order("created_at",{ascending:false}).limit(200);
    if (result.error) throw result.error;
    return Response.json({materials:result.data || []});
  } catch (error) { return Response.json({materials:[],error:describeSupabaseError(error)},{status:500}); }
}
export async function POST(req: Request) {
  try {
    const input = await req.json();
    if (!input.organization?.trim()) return Response.json({error:"机构名称不能为空"},{status:400});
    if (!input.sourceUrl?.trim() && !input.rawText?.trim() && !input.hasAttachments) return Response.json({error:"链接、正文或附件至少提供一种"},{status:400});
    const sb = getSupabaseAdmin(), duplicates = await findDuplicates(sb,input);
    if (duplicates.length && !input.allowDuplicate) return Response.json({error:"发现重复素材，请预览后确认",code:"DUPLICATE",duplicates},{status:409});
    const material = await createMaterial(sb,input);
    await recordAudit(sb,"material.created","material",material.id,{sourceType:input.sourceType || "manual"});
    return Response.json({material,duplicates},{status:201});
  } catch (error) { return Response.json({error:describeSupabaseError(error)},{status:500}); }
}

export async function PATCH(req: Request) {
  try {
    const {ids,changes,action} = await req.json() as {ids:string[];changes?:Record<string,unknown>;action?:string};
    if (!Array.isArray(ids) || !ids.length || ids.length > 500) return Response.json({error:"请选择 1-500 条素材"},{status:400});
    const allowed = new Set(["competitor_id","platform","content_type","product_lines","audience_tags","theme_tags","review_status","analysis_status","human_review_status","report_status","is_new","note","focus_points"]);
    const safe = Object.fromEntries(Object.entries(changes || {}).filter(([key]) => allowed.has(key)));
    if (action === "delete") Object.assign(safe,{deleted_at:new Date().toISOString()});
    if (action === "restore") Object.assign(safe,{deleted_at:null});
    if (!Object.keys(safe).length) return Response.json({error:"没有可更新字段"},{status:400});
    const sb = getSupabaseAdmin(), result = await sb.from("materials").update(safe).in("id",ids).select("id");
    if (result.error) throw result.error;
    await Promise.all(ids.map(id => recordAudit(sb,"material.updated","material",id,{changes:safe})));
    return Response.json({updated:result.data?.length || 0});
  } catch (error) { return Response.json({error:describeSupabaseError(error)},{status:500}); }
}
