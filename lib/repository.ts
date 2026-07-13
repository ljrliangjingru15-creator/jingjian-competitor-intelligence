import type {SupabaseClient} from "@supabase/supabase-js";
import {contentHash, evidenceId, inferPlatform, isMissingSchemaError, normalizeAlias, normalizeText, normalizeUrl} from "./data-utils";

export async function resolveCompetitor(sb: SupabaseClient, rawName: string, create = true) {
  const name = normalizeText(rawName);
  if (!name) throw new Error("机构名称不能为空");
  const exact = await sb.from("competitors").select("id,name").is("deleted_at", null).ilike("name", name).maybeSingle();
  if (!exact.error && exact.data) return exact.data;
  if (exact.error) {
    const legacy = await sb.from("competitors").select("id,name").eq("name", name).maybeSingle();
    if (legacy.data) return legacy.data;
    if (legacy.error && !isMissingSchemaError(legacy.error)) throw legacy.error;
  }
  const alias = await sb.from("competitor_aliases").select("competitor_id,competitors(id,name)").eq("normalized_alias", normalizeAlias(name)).maybeSingle();
  if (!alias.error && alias.data) {
    const nested = alias.data.competitors as unknown as {id: string; name: string} | null;
    if (nested) return nested;
  }
  if (!create) return null;
  const created = await sb.from("competitors").insert({name}).select("id,name").single();
  if (created.error) throw created.error;
  await sb.from("competitor_aliases").insert({competitor_id: created.data.id, alias: name, normalized_alias: normalizeAlias(name)});
  return created.data;
}

export type NewMaterialInput = {
  organization: string;
  title?: string;
  sourceUrl?: string;
  rawText?: string;
  platform?: string;
  accountName?: string;
  publishedAt?: string;
  note?: string;
  focusPoints?: string;
  sourceType?: string;
  contentType?: string;
  tag?: string;
  themeTags?: string[];
  importJobId?: string;
  isNew?: boolean;
};

export async function findDuplicates(sb: SupabaseClient, input: Pick<NewMaterialInput, "organization" | "title" | "sourceUrl" | "rawText">) {
  const url = normalizeUrl(input.sourceUrl), hash = contentHash(input.title, input.rawText);
  const competitor = await resolveCompetitor(sb, input.organization, false);
  const matches: Array<Record<string, unknown>> = [];
  if (url) {
    const byUrl = await sb.from("materials").select("id,evidence_id,title,source_url,competitors(name)").eq("normalized_url", url).is("deleted_at", null).limit(10);
    if (!byUrl.error) matches.push(...(byUrl.data || []).map(x => ({...x, reason: "same_url"})));
    else {
      const legacy = await sb.from("materials").select("id,title,source_url,competitors(name)").eq("source_url", input.sourceUrl || "").limit(10);
      matches.push(...(legacy.data || []).map(x => ({...x, reason: "same_url"})));
    }
  }
  if (hash) {
    const byHash = await sb.from("materials").select("id,evidence_id,title,source_url,competitors(name)").eq("content_hash", hash).is("deleted_at", null).limit(10);
    if (!byHash.error) matches.push(...(byHash.data || []).map(x => ({...x, reason: "same_content"})));
  }
  if (competitor?.id && normalizeText(input.title)) {
    const byTitle = await sb.from("materials").select("id,evidence_id,title,source_url,competitors(name)").eq("competitor_id", competitor.id).ilike("title", normalizeText(input.title)).limit(10);
    if (!byTitle.error) matches.push(...(byTitle.data || []).map(x => ({...x, reason: "same_title"})));
  }
  return [...new Map(matches.map(item => [String(item.id), item])).values()];
}

export async function createMaterial(sb: SupabaseClient, input: NewMaterialInput) {
  const competitor = await resolveCompetitor(sb, input.organization, true);
  const id = crypto.randomUUID();
  const title = normalizeText(input.title) || "新收集的外宣内容";
  const sourceUrl = normalizeText(input.sourceUrl) || null;
  const rich = {
    id,
    evidence_id: evidenceId(id),
    competitor_id: competitor!.id,
    original_organization: normalizeText(input.organization),
    title,
    source_url: sourceUrl,
    normalized_url: normalizeUrl(sourceUrl),
    platform: normalizeText(input.platform) || inferPlatform(sourceUrl),
    account_name: normalizeText(input.accountName) || null,
    published_at: input.publishedAt || null,
    raw_text: normalizeText(input.rawText) || null,
    note: normalizeText(input.note) || null,
    focus_points: normalizeText(input.focusPoints) || null,
    source_type: normalizeText(input.sourceType) || "manual",
    content_type: normalizeText(input.contentType) || null,
    tag: normalizeText(input.tag) || "待分类",
    theme_tags: input.themeTags || [],
    content_hash: contentHash(title, input.rawText),
    import_job_id: input.importJobId || null,
    is_new: input.isNew ?? true,
    collection_status: "identified",
    review_status: "approved",
    analysis_status: "pending",
    human_review_status: "pending",
    report_status: "unused",
    status: "待分析",
  };
  let inserted = await sb.from("materials").insert(rich).select().single();
  if (inserted.error && isMissingSchemaError(inserted.error)) {
    inserted = await sb.from("materials").insert({
      id, competitor_id: competitor!.id, title, source_url: sourceUrl,
      platform: rich.platform, tag: rich.tag, status: "待分析", note: rich.note, source_type: rich.source_type,
    }).select().single();
  }
  if (inserted.error) throw inserted.error;
  return inserted.data;
}

export async function recordAudit(sb: SupabaseClient, action: string, entityType: string, entityId: string, metadata: Record<string, unknown> = {}) {
  const result = await sb.from("audit_logs").insert({action, entity_type: entityType, entity_id: entityId, metadata});
  if (result.error && !isMissingSchemaError(result.error)) throw result.error;
}
