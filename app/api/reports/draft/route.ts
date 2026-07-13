import {getSupabaseAdmin,describeSupabaseError} from "../../../../lib/supabase-admin";
/* eslint-disable @typescript-eslint/no-explicit-any */

const nameOf=(row:Record<string,any>)=>Array.isArray(row.competitors)?row.competitors[0]?.name:row.competitors?.name;
const count=(values:string[])=>Object.entries(values.reduce<Record<string,number>>((acc,value)=>{if(value)acc[value]=(acc[value]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));
export async function POST(req:Request){
  try{
    const {reportId}=await req.json(),sb=getSupabaseAdmin(),project=await sb.from("report_projects").select("*,report_material_links(material_id)").eq("id",reportId).single();
    if(project.error)throw project.error;
    const ids=(project.data.report_material_links||[]).map((x:{material_id:string})=>x.material_id);
    let query=sb.from("materials").select("id,evidence_id,title,platform,theme_tags,tag,analysis_status,human_review_status,competitors(name)").is("deleted_at",null).gte("created_at",project.data.period_start).lte("created_at",`${project.data.period_end}T23:59:59.999Z`);
    if(ids.length)query=query.in("id",ids);
    const result=await query;if(result.error)throw result.error;
    const rows=(result.data||[]) as Array<Record<string,any>>,draft={schema_version:"1.0",generated_at:new Date().toISOString(),data_quality:{materials:rows.length,analyzed:rows.filter(x=>x.analysis_status==="completed").length,reviewed:rows.filter(x=>["reviewed","modified","not_required"].includes(x.human_review_status)).length,warning:rows.length<5?"样本不足，不建议给出强趋势结论":null},organizations:count(rows.map(x=>nameOf(x)||"未知机构")),platforms:count(rows.map(x=>x.platform||"待识别")),themes:count(rows.flatMap(x=>[x.tag,...(x.theme_tags||[])]).filter(Boolean)),evidence_ids:rows.map(x=>x.evidence_id),sections:[{key:"executive_summary",title:"管理层摘要",status:"needs_analysis"},{key:"market_signals",title:"市场风向",status:"needs_analysis"},{key:"competitor_moves",title:"竞品动作",status:"needs_analysis"},{key:"recommendations",title:"我方行动建议",status:"needs_analysis"}]};
    const saved=await sb.from("report_projects").update({draft,status:"draft_ready",version:Number(project.data.version||1)+1}).eq("id",reportId).select().single();if(saved.error)throw saved.error;
    return Response.json({report:saved.data,draft});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}
