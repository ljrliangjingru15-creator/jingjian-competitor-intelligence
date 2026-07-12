import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organization: text("organization").notNull(),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  platform: text("platform").notNull().default("待识别"),
  tag: text("tag").notNull().default("待分类"),
  status: text("status").notNull().default("待分析"),
  note: text("note"),
  sourceType: text("source_type").notNull().default("manual"),
  analysisJson: text("analysis_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const monitorTasks = sqliteTable("monitor_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  organization: text("organization").notNull(),
  region: text("region").notNull(),
  keywords: text("keywords").notNull(),
  sources: text("sources").notNull(),
  frequency: text("frequency").notNull(),
  reviewMode: text("review_mode").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const materialFiles = sqliteTable("material_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  materialId: integer("material_id").notNull(),
  objectKey: text("object_key").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const discoveries = sqliteTable("discoveries", {
  id: integer("id").primaryKey({ autoIncrement: true }), organization:text("organization").notNull(), title:text("title").notNull(), url:text("url").notNull(), source:text("source").notNull(), summary:text("summary"), confidence:text("confidence").default("B"), status:text("status").notNull().default("待审核"), publishedAt:text("published_at"), createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date())
});

export const reports = sqliteTable("reports", {
  id:integer("id").primaryKey({autoIncrement:true}), period:text("period").notNull(), format:text("format").notNull(), objectKey:text("object_key").notNull(), status:text("status").notNull().default("已生成"), createdAt:integer("created_at",{mode:"timestamp"}).notNull().$defaultFn(()=>new Date())
});
