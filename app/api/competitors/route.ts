import {getSupabaseAdmin,describeSupabaseError} from "../../../lib/supabase-admin";
import {normalizeAlias,normalizeText,isMissingSchemaError} from "../../../lib/data-utils";
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(){
  try{
    const sb=getSupabaseAdmin();
    let competitors=await sb.from("competitors").select("*,competitor_aliases(id,alias)").is("deleted_at",null).order("is_key",{ascending:false}).order("name");
    if(competitors.error&&isMissingSchemaError(competitors.error))competitors=await sb.from("competitors").select("*").order("name");
    if(competitors.error)throw competitors.error;
    const [materials,events]=await Promise.all([sb.from("materials").select("competitor_id,platform,tag,theme_tags,product_lines,audience_tags,content_type,created_at,analysis").is("deleted_at",null),sb.from("marketing_events").select("competitor_id,id")]);
    const legacyMaterials=materials.error&&isMissingSchemaError(materials.error)?await sb.from("materials").select("competitor_id,platform,tag,created_at,analysis"):materials;
    const rows=(competitors.data||[]).map(competitor=>{
      const own=((legacyMaterials.data||[]) as Array<Record<string,any>>).filter(x=>x.competitor_id===competitor.id),eventCount=events.error?0:(events.data||[]).filter(x=>x.competitor_id===competitor.id).length;
      const frequencies=(values:string[])=>Object.entries(values.filter(Boolean).reduce<Record<string,number>>((acc,x)=>(acc[x]=(acc[x]||0)+1,acc),{})).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name,count}));
      const tags=own.flatMap(x=>[x.tag,...(Array.isArray(x.theme_tags)?x.theme_tags:[])]).filter(Boolean) as string[];
      const platforms=own.map(x=>x.platform).filter(Boolean) as string[];
      const products=own.flatMap(x=>Array.isArray(x.product_lines)?x.product_lines:[]).filter(Boolean) as string[];
      const audiences=own.flatMap(x=>Array.isArray(x.audience_tags)?x.audience_tags:[]).filter(Boolean) as string[];
      const strategies=own.flatMap(x=>{const a=x.analysis as Record<string,unknown>|null;return a&&Array.isArray(a.marketing_strategies)?a.marketing_strategies:[]}).map(String);
      const days90=own.filter(x=>new Date(x.created_at).getTime()>=Date.now()-90*86400000),days30=days90.filter(x=>new Date(x.created_at).getTime()>=Date.now()-30*86400000);
      const previous60=Math.max(0,days90.length-days30.length),baseline=previous60/2;
      const trend=own.length<4?"数据不足":days30.length>baseline*1.25?"升温":days30.length<baseline*.75?"降温":"稳定";
      return {...competitor,aliases:competitor.competitor_aliases||[],materialCount:own.length,eventCount,trend,trendRationale:own.length<4?"有效样本少于4条":`近30天 ${days30.length} 条；此前60天月均 ${baseline.toFixed(1)} 条`,themes:frequencies(tags),platforms:frequencies(platforms),products:frequencies(products),audiences:frequencies(audiences),strategies:frequencies(strategies),recentMaterials:own.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5)};
    });
    return Response.json({competitors:rows});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}

export async function POST(req:Request){
  try{
    const input=await req.json(),name=normalizeText(input.name);
    if(!name)return Response.json({error:"标准机构名称不能为空"},{status:400});
    const sb=getSupabaseAdmin(),payload={name,english_name:normalizeText(input.englishName)||null,type:normalizeText(input.type)||null,city:normalizeText(input.city)||null,region:normalizeText(input.region)||null,campus:normalizeText(input.campus)||null,headquarters:normalizeText(input.headquarters)||null,key_markets:Array.isArray(input.keyMarkets)?input.keyMarkets.map(normalizeText).filter(Boolean):[],is_key:Boolean(input.isKey),monitoring_enabled:Boolean(input.monitoringEnabled)};
    const result=input.id?await sb.from("competitors").update(payload).eq("id",input.id).select().single():await sb.from("competitors").insert(payload).select().single();
    if(result.error)throw result.error;
    if(Array.isArray(input.aliases)){
      await sb.from("competitor_aliases").delete().eq("competitor_id",result.data.id);
      const aliases=[name,...input.aliases.map(normalizeText)].filter(Boolean);
      if(aliases.length)await sb.from("competitor_aliases").insert([...new Set(aliases)].map(alias=>({competitor_id:result.data.id,alias,normalized_alias:normalizeAlias(alias)})));
    }
    return Response.json({competitor:result.data},{status:input.id?200:201});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}
