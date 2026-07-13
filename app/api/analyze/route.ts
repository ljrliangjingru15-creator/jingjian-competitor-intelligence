import {getSupabaseAdmin,describeSupabaseError} from "../../../lib/supabase-admin";
import {analyzeMaterial} from "../../../lib/analysis";

export async function POST(req:Request){
  try{
    const body=await req.json() as {materialId?:string},sb=getSupabaseAdmin();
    if(!body.materialId)return Response.json({error:"materialId required"},{status:400});
    const {data:material,error}=await sb.from("materials").select("*,competitors(name)").eq("id",body.materialId).single();
    if(error||!material)return Response.json({error:error?.message||"素材不存在"},{status:404});
    return Response.json(await analyzeMaterial(sb,material));
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}
