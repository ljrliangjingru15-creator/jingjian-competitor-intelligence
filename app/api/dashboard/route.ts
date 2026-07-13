import {getSupabaseAdmin,describeSupabaseError} from "../../../lib/supabase-admin";

async function countQuery(query: PromiseLike<{count:number|null;error:unknown}>) { const result=await query; return result.error ? null : result.count || 0; }
export async function GET(){
  try{
    const sb=getSupabaseAdmin(),now=new Date(),monthStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString();
    const [monthMaterials,activeMonitors,totalCompetitors,recentMaterials,legacyDiscoveries,recentRawLeads]=await Promise.all([
      countQuery(sb.from("materials").select("id",{count:"exact",head:true}).gte("created_at",monthStart)),
      countQuery(sb.from("monitor_tasks").select("id",{count:"exact",head:true}).eq("enabled",true)),
      countQuery(sb.from("competitors").select("id",{count:"exact",head:true})),
      sb.from("materials").select("id,title,platform,status,created_at,competitors(name)").order("created_at",{ascending:false}).limit(8),
      sb.from("discoveries").select("id,title,url,source,status,created_at,competitors(name)").order("created_at",{ascending:false}).limit(5),
      sb.from("raw_leads").select("id,title,url,source,review_status,discovered_at,competitors(name)").order("discovered_at",{ascending:false}).limit(5),
    ]);
    const richCounts=await Promise.all([
      countQuery(sb.from("raw_leads").select("id",{count:"exact",head:true}).eq("review_status","pending")),
      countQuery(sb.from("materials").select("id",{count:"exact",head:true}).eq("analysis_status","pending").is("deleted_at",null)),
      countQuery(sb.from("materials").select("id",{count:"exact",head:true}).eq("human_review_status","pending").eq("analysis_status","completed").is("deleted_at",null)),
      countQuery(sb.from("marketing_events").select("id",{count:"exact",head:true}).gte("created_at",monthStart).is("deleted_at",null)),
      countQuery(sb.from("materials").select("id",{count:"exact",head:true}).in("analysis_status",["failed","quota_exceeded","model_unavailable"]).is("deleted_at",null)),
    ]);
    let [pendingLeads,pendingAnalysis,pendingHumanReview,monthEvents,analysisFailures]=richCounts;
    if(pendingLeads===null) pendingLeads=await countQuery(sb.from("discoveries").select("id",{count:"exact",head:true}).eq("status","待审核"));
    if(pendingAnalysis===null) pendingAnalysis=await countQuery(sb.from("materials").select("id",{count:"exact",head:true}).eq("status","待分析"));
    if(pendingHumanReview===null) pendingHumanReview=0;if(monthEvents===null)monthEvents=0;if(analysisFailures===null)analysisFailures=0;
    const recentLeads=recentRawLeads.error?(legacyDiscoveries.data||[]):((recentRawLeads.data||[]).map(x=>({...x,status:x.review_status,created_at:x.discovered_at})));
    return Response.json({kpis:{monthMaterials:monthMaterials||0,pendingLeads:pendingLeads||0,pendingAnalysis:pendingAnalysis||0,pendingHumanReview:pendingHumanReview||0,activeMonitors:activeMonitors||0,monthEvents:monthEvents||0,analysisFailures:analysisFailures||0,totalCompetitors:totalCompetitors||0},recentMaterials:recentMaterials.data||[],recentLeads,schemaReady:!richCounts.some(x=>x===null)});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}
