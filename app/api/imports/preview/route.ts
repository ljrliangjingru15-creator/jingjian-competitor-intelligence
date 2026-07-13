import {getSupabaseAdmin,describeSupabaseError} from "../../../../lib/supabase-admin";
import {parseCsv,normalizeText} from "../../../../lib/data-utils";
import {parseXlsx} from "../../../../lib/xlsx";
import {findDuplicates,resolveCompetitor} from "../../../../lib/repository";

const aliases:Record<string,string[]>={organization:["机构名称","机构","竞品机构","organization","competitor"],sourceUrl:["链接","原始链接","url","source_url"],rawText:["正文","原始正文","内容","raw_text","text"],publishedAt:["发布时间","日期","published_at","date"],platform:["平台","platform"],title:["标题","内容标题","title"],note:["备注","用户备注","note"],focusPoints:["关注重点","重点关注","focus_points"]};
const detect=(headers:string[])=>Object.fromEntries(Object.entries(aliases).map(([key,names])=>[key,headers.find(h=>names.includes(normalizeText(h).toLowerCase()))||null]));
export async function POST(req:Request){
  try{
    const form=await req.formData(),file=form.get("file"),mappingRaw=String(form.get("mapping")||"");if(!(file instanceof File))return Response.json({error:"请选择CSV或Excel文件"},{status:400});if(file.size>15*1024*1024)return Response.json({error:"导入文件不能超过15MB"},{status:400});
    const name=file.name.toLowerCase();let rows:string[][];if(name.endsWith(".csv"))rows=parseCsv(await file.text());else if(name.endsWith(".xlsx"))rows=await parseXlsx(await file.arrayBuffer());else return Response.json({error:"仅支持 .csv 和 .xlsx"},{status:400});
    const headers=(rows.shift()||[]).map(normalizeText),mapping=mappingRaw?JSON.parse(mappingRaw):detect(headers),sb=getSupabaseAdmin();
    const job=await sb.from("import_jobs").insert({filename:file.name,format:name.endsWith(".csv")?"csv":"xlsx",status:"preview",mapping,total_rows:rows.length}).select().single();if(job.error)throw job.error;
    const preview=[];for(let i=0;i<rows.length;i++){const raw=Object.fromEntries(headers.map((h,j)=>[h,rows[i][j]||""])),value=(key:string)=>normalizeText(raw[mapping[key]]),normalized={organization:value("organization"),sourceUrl:value("sourceUrl"),rawText:value("rawText"),publishedAt:value("publishedAt"),platform:value("platform"),title:value("title"),note:value("note"),focusPoints:value("focusPoints")},errors:string[]=[];if(!normalized.organization)errors.push("缺少机构名称");if(!normalized.sourceUrl&&!normalized.rawText)errors.push("链接或正文至少填写一项");let competitor=null,duplicates:Record<string,unknown>[]=[];if(!errors.length){competitor=await resolveCompetitor(sb,normalized.organization,false);duplicates=await findDuplicates(sb,normalized)}preview.push({rowNumber:i+2,raw,normalized,errors,competitor,duplicates})}
    await sb.from("import_job_rows").insert(preview.map(row=>({import_job_id:job.data.id,row_number:row.rowNumber,raw_data:row.raw,normalized_data:row.normalized,status:row.errors.length?"invalid":"valid",errors:row.errors})));
    return Response.json({job:job.data,headers,mapping,rows:preview,summary:{total:preview.length,valid:preview.filter(x=>!x.errors.length).length,invalid:preview.filter(x=>x.errors.length).length,duplicates:preview.filter(x=>x.duplicates.length).length,unmappedCompetitors:preview.filter(x=>!x.competitor&&!x.errors.length).length}});
  }catch(error){return Response.json({error:describeSupabaseError(error)},{status:500})}
}

