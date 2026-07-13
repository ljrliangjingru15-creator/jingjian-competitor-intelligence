import {getSupabaseAdmin,describeSupabaseError} from "../../../lib/supabase-admin";
import {createMaterial,recordAudit} from "../../../lib/repository";
import {isMissingSchemaError} from "../../../lib/data-utils";

export async function GET(){
  try{
    const sb=getSupabaseAdmin();
    const leads=await sb.from("raw_leads").select("*,competitors(name)").is("deleted_at",null).order("discovered_at",{ascending:false}).limit(300);
    if(!leads.error)return Response.json({discoveries:(leads.data||[]).map(x=>({...x,url:x.url,status:x.review_status,confidence:x.confidence,created_at:x.discovered_at,isLegacy:false}))});
    if(!isMissingSchemaError(leads.error))throw leads.error;
    const legacy=await sb.from("discoveries").select("*,competitors(name)").order("created_at",{ascending:false}).limit(300);
    if(legacy.error)throw legacy.error;
    return Response.json({discoveries:(legacy.data||[]).map(x=>({...x,review_status:x.status==="已入库"?"approved":x.status==="已忽略"?"ignored":"pending",discovered_at:x.created_at,isLegacy:true}))});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}
export async function PATCH(req:Request){
  try{
    const input=await req.json() as {id:string;action:"approve"|"reject"|"merge_material"|"merge_event"|"create_event";organization?:string;title?:string;platform?:string;tags?:string[];targetId?:string;eventName?:string},sb=getSupabaseAdmin();
    if(!input.id)return Response.json({error:"缺少线索编号"},{status:400});
    let itemResult=await sb.from("raw_leads").select("*,competitors(name)").eq("id",input.id).single(),legacy=false;
    if(itemResult.error&&isMissingSchemaError(itemResult.error)){legacy=true;itemResult=await sb.from("discoveries").select("*,competitors(name)").eq("id",input.id).single()}
    if(itemResult.error||!itemResult.data)return Response.json({error:itemResult.error?.message||"线索不存在"},{status:404});
    const item=itemResult.data as Record<string,unknown>,org=input.organization||((item.competitors as {name?:string}|null)?.name)||String(item.original_organization||"待确认机构");
    if(input.action==="reject"){
      if(legacy)await sb.from("discoveries").update({status:"已忽略"}).eq("id",input.id);else await sb.from("raw_leads").update({review_status:"ignored",reviewed_at:new Date().toISOString()}).eq("id",input.id);
      await recordAudit(sb,"lead.ignored","raw_lead",input.id);return Response.json({ok:true,status:"ignored"});
    }
    if(input.action==="merge_material"){
      if(!input.targetId)return Response.json({error:"请选择目标素材"},{status:400});
      if(!legacy)await sb.from("raw_leads").update({review_status:"merged",review_note:`合并到素材 ${input.targetId}`,reviewed_at:new Date().toISOString()}).eq("id",input.id);
      else await sb.from("discoveries").update({status:"已入库"}).eq("id",input.id);
      await recordAudit(sb,"lead.merged_material","raw_lead",input.id,{targetId:input.targetId});return Response.json({ok:true,status:"merged"});
    }
    const material=await createMaterial(sb,{organization:org,title:input.title||String(item.title||"自动发现内容"),sourceUrl:String(item.url||""),rawText:String(item.extracted_text||item.summary||""),platform:input.platform||String(item.platform||item.source||"网页"),publishedAt:item.published_at?String(item.published_at):undefined,note:String(item.summary||""),sourceType:"monitor",themeTags:input.tags});
    if(!legacy)await sb.from("raw_leads").update({review_status:"approved",reviewed_at:new Date().toISOString()}).eq("id",input.id);else await sb.from("discoveries").update({status:"已入库"}).eq("id",input.id);
    let event=null;
    if(input.action==="create_event"){
      const competitorId=material.competitor_id,eventId=crypto.randomUUID(),code=`EVT-${eventId.replaceAll("-","").slice(0,12).toUpperCase()}`;
      const created=await sb.from("marketing_events").insert({id:eventId,event_code:code,name:input.eventName||input.title||String(item.title),competitor_id:competitorId,start_at:item.published_at||new Date().toISOString(),confirmation_status:"confirmed"}).select().single();
      if(created.error)throw created.error;event=created.data;await sb.from("material_event_links").insert({material_id:material.id,event_id:eventId});
    }else if(input.action==="merge_event"){
      if(!input.targetId)return Response.json({error:"请选择目标宣传事件"},{status:400});
      await sb.from("material_event_links").upsert({material_id:material.id,event_id:input.targetId});
    }
    await recordAudit(sb,"lead.approved","raw_lead",input.id,{materialId:material.id,eventId:(event as {id?:string}|null)?.id||input.targetId});
    return Response.json({ok:true,status:"approved",material,event});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}
