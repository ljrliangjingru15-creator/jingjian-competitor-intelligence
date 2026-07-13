import {getSupabaseAdmin,describeSupabaseError} from "../../../../lib/supabase-admin";
import {findDuplicates,resolveCompetitor} from "../../../../lib/repository";
import {inferPlatform,normalizeText,normalizeUrl} from "../../../../lib/data-utils";

export async function POST(req:Request){
  try{
    const input=await req.json(),sb=getSupabaseAdmin();
    if(!input.organization?.trim())return Response.json({error:"机构名称不能为空"},{status:400});
    const competitor=await resolveCompetitor(sb,input.organization,false),duplicates=await findDuplicates(sb,input);
    const title=normalizeText(input.title||input.note)||"新收集的外宣内容";
    const suggestedTags=[/报告|白皮书/.test(title)?"白皮书":null,/活动|讲座|直播|私享会/.test(title)?"活动邀约":null,/录取|offer/i.test(title)?"录取案例":null].filter(Boolean);
    return Response.json({preview:{competitor:competitor||{name:input.organization,unmapped:true},title,platform:input.platform||inferPlatform(input.sourceUrl),publishedAt:input.publishedAt||null,sourceUrl:normalizeUrl(input.sourceUrl),rawText:input.rawText||null,suggestedTags,confidence:input.sourceUrl?0.72:0.45,duplicates,similar:duplicates.filter((x:Record<string,unknown>)=>x.reason!=="same_url")}});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}

