import {getSupabaseAdmin,storageBucket,describeSupabaseError} from "../../../lib/supabase-admin";
import {isMissingSchemaError} from "../../../lib/data-utils";

const allowed = new Set(["image/jpeg","image/png","image/webp","image/gif","application/pdf","text/plain","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
export async function POST(req:Request){
  try {
    const form=await req.formData(),file=form.get("file"),materialId=String(form.get("materialId")||""),sortOrder=Number(form.get("sortOrder")||0),isPrimary=String(form.get("isPrimary")||"")==="true";
    if(!(file instanceof File)||!materialId)return Response.json({error:"缺少文件或素材编号"},{status:400});
    if(file.size>20*1024*1024)return Response.json({error:"文件不能超过20MB"},{status:400});
    if(file.type && !allowed.has(file.type))return Response.json({error:`不支持的文件类型：${file.type}`},{status:400});
    const extension=(file.name.split(".").pop()||"").toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,10),safeName=`${crypto.randomUUID()}${extension?`.`+extension:""}`,sb=getSupabaseAdmin(),path=`materials/${materialId}/${safeName}`;
    const up=await sb.storage.from(storageBucket()).upload(path,await file.arrayBuffer(),{contentType:file.type||"application/octet-stream",upsert:false});
    if(up.error)throw up.error;
    let saved=await sb.from("material_assets").insert({material_id:materialId,object_path:path,filename:file.name,mime_type:file.type||"application/octet-stream",size_bytes:file.size,sort_order:sortOrder,is_primary:isPrimary}).select().single();
    if(saved.error&&isMissingSchemaError(saved.error)) saved=await sb.from("material_files").insert({material_id:materialId,object_path:path,filename:file.name,content_type:file.type||"application/octet-stream",size:file.size}).select().single();
    if(saved.error){await sb.storage.from(storageBucket()).remove([path]);throw saved.error;}
    return Response.json({file:saved.data},{status:201});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}
