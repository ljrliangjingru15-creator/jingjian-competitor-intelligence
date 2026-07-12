import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { materials } from "../../../db/schema";

export async function GET() {
  try { return Response.json({ materials: await getDb().select().from(materials).orderBy(desc(materials.createdAt)).limit(200) }); }
  catch { return Response.json({ materials: [], setupRequired: true }); }
}

export async function POST(request: Request) {
  const p = await request.json() as { organization?:string; title?:string; sourceUrl?:string; platform?:string; tag?:string; status?:string; note?:string; sourceType?:string };
  if (!p.organization?.trim()) return Response.json({ error: "organization is required" }, { status: 400 });
  try {
    const [material] = await getDb().insert(materials).values({ organization:p.organization.trim(), title:p.title?.trim() || "新收集的外宣内容", sourceUrl:p.sourceUrl, platform:p.platform || "待识别", tag:p.tag || "待分类", status:p.status || "待分析", note:p.note, sourceType:p.sourceType || "manual" }).returning();
    return Response.json({ material }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "database unavailable" }, { status: 500 }); }
}
