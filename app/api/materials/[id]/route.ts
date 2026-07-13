import {getSupabaseAdmin,describeSupabaseError,storageBucket} from "../../../../lib/supabase-admin";
import {isMissingSchemaError} from "../../../../lib/data-utils";

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params,sb=getSupabaseAdmin();
    let result=await sb.from("materials").select("*,competitors(*),material_assets(*),material_event_links(marketing_events(*)),analysis_results(*,analysis_versions(*,analysis_evidence(*)))").eq("id",id).single();
    if(result.error&&isMissingSchemaError(result.error))result=await sb.from("materials").select("*,competitors(*),material_files(*)").eq("id",id).single();
    if(result.error)throw result.error;
    const material=result.data as Record<string,unknown>,assets=(material.material_assets||material.material_files||[]) as Array<Record<string,unknown>>;
    const signed=await Promise.all(assets.map(async asset=>{const path=String(asset.object_path||"");const {data}=await sb.storage.from(storageBucket()).createSignedUrl(path,600);return {...asset,url:data?.signedUrl||null}}));
    return Response.json({material:{...material,assets:signed}});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}

