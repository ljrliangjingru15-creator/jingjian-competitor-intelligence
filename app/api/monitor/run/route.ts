import {getSupabaseAdmin,describeSupabaseError} from "../../../../lib/supabase-admin";
import {classifyAiError} from "../../../../lib/analysis";
import {normalizeUrl} from "../../../../lib/data-utils";
import {resolveCompetitor} from "../../../../lib/repository";

function outputText(payload:Record<string,unknown>){const output=Array.isArray(payload.output)?payload.output:[];return output.flatMap(item=>item&&typeof item==="object"&&Array.isArray((item as {content?:unknown[]}).content)?(item as {content:unknown[]}).content:[]).map(part=>part&&typeof part==="object"&&"text" in part?String((part as {text:unknown}).text):"").join("")}
export async function POST(req:Request){
  const sb=getSupabaseAdmin();let runId:string|undefined;
  try{
    const {taskId,organization,keywords,region}=await req.json() as Record<string,string>,key=process.env.OPENAI_API_KEY;
    if(!organization?.trim())return Response.json({error:"请选择监测机构"},{status:400});
    const run=await sb.from("monitoring_runs").insert({task_id:taskId||null,status:"running",started_at:new Date().toISOString()}).select("id").single();runId=run.data?.id;
    if(!key){if(runId)await sb.from("monitoring_runs").update({status:"failed",finished_at:new Date().toISOString(),error_code:"configuration_missing",error_message:"未配置 OPENAI_API_KEY"}).eq("id",runId);return Response.json({error:"未配置内部模型，可继续手动投递或导入",code:"configuration_missing"},{status:503})}
    const model=process.env.OPENAI_MODEL||"gpt-5.6-terra",prompt=`搜索“${organization}”最近30天在${region||"中国"}的可核实公开外宣动态。关键词：${keywords||"留学、活动、产品、合作、报告"}。仅返回JSON数组，每项包含title,url,source,platform,summary,published_at。不要编造URL，没有结果返回[]。`;
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify({model,tools:[{type:"web_search"}],input:prompt})}),payload=await response.json() as Record<string,unknown>;
    if(!response.ok){const code=classifyAiError(response.status,payload);if(runId)await sb.from("monitoring_runs").update({status:"failed",finished_at:new Date().toISOString(),error_code:code,error_message:JSON.stringify(payload).slice(0,1800)}).eq("id",runId);return Response.json({error:"公开网络监测失败",code,details:payload},{status:response.status})}
    let leads:Record<string,unknown>[]=[];try{const text=outputText(payload).replace(/^```json|```$/g,"").trim();leads=JSON.parse(text)}catch{if(runId)await sb.from("monitoring_runs").update({status:"failed",finished_at:new Date().toISOString(),error_code:"invalid_response",error_message:"无法解析搜索结果"}).eq("id",runId);return Response.json({error:"搜索结果格式无法解析",code:"invalid_response"},{status:422})}
    const competitor=await resolveCompetitor(sb,organization,true),rows=[];let duplicates=0;
    for(const lead of leads.slice(0,30)){
      if(!lead.title||!lead.url)continue;const normalized=normalizeUrl(lead.url);
      const existing=await sb.from("raw_leads").select("id").eq("normalized_url",normalized).maybeSingle();if(existing.data){duplicates++;continue}
      const saved=await sb.from("raw_leads").insert({competitor_id:competitor!.id,original_organization:organization,title:String(lead.title),url:String(lead.url),normalized_url:normalized,source:String(lead.source||"公开网络"),platform:String(lead.platform||lead.source||"网页"),summary:String(lead.summary||""),published_at:lead.published_at||null,monitor_run_id:runId||null,review_status:"pending",duplicate_status:"unique"}).select().single();if(!saved.error)rows.push(saved.data)
    }
    if(runId)await sb.from("monitoring_runs").update({status:"completed",finished_at:new Date().toISOString(),discovered_count:rows.length,duplicate_count:duplicates}).eq("id",runId);
    if(taskId)await sb.from("monitor_tasks").update({last_run_at:new Date().toISOString()}).eq("id",taskId);
    return Response.json({runId,discovered:rows.length,duplicates,leads:rows});
  }catch(error){if(runId)await sb.from("monitoring_runs").update({status:"failed",finished_at:new Date().toISOString(),error_code:"unknown_error",error_message:describeSupabaseError(error)}).eq("id",runId);return Response.json({error:describeSupabaseError(error),code:"unknown_error"},{status:500})}
}
