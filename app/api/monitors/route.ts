import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { monitorTasks } from "../../../db/schema";

export async function GET() {
  try { return Response.json({ monitors: await getDb().select().from(monitorTasks).orderBy(desc(monitorTasks.createdAt)) }); }
  catch { return Response.json({ monitors: [], setupRequired: true }); }
}
export async function POST(request: Request) {
  const p = await request.json() as { organization?:string; region?:string; keywords?:string; sources?:string[]; frequency?:string; reviewMode?:string };
  if (!p.organization?.trim()) return Response.json({ error:"organization is required" }, { status:400 });
  try { const [monitor] = await getDb().insert(monitorTasks).values({ organization:p.organization.trim(), region:p.region || "全国 + 广州及大湾区", keywords:p.keywords || "", sources:JSON.stringify(p.sources || []), frequency:p.frequency || "每周一、周四", reviewMode:p.reviewMode || "先进入审核箱" }).returning(); return Response.json({ monitor }, { status:201 }); }
  catch (error) { return Response.json({ error:error instanceof Error ? error.message : "database unavailable" }, { status:500 }); }
}
