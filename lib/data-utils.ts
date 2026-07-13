import {createHash} from "node:crypto";

export function normalizeText(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

export function normalizeAlias(value: unknown) {
  return normalizeText(value).toLowerCase().replace(/[\s·•\-_—（）()]+/g, "");
}

export function normalizeUrl(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "spm", "from"].forEach(key => url.searchParams.delete(key));
    url.hostname = url.hostname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    const query = [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
    url.search = "";
    query.forEach(([key, val]) => url.searchParams.append(key, val));
    return url.toString();
  } catch {
    return raw.toLowerCase().replace(/[?#].*$/, "");
  }
}

export function contentHash(...parts: unknown[]) {
  const body = parts.map(normalizeText).filter(Boolean).join("\n").toLowerCase();
  return body ? createHash("sha256").update(body).digest("hex") : null;
}

export function evidenceId(id: string) {
  return `EVD-${id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export function inferPlatform(url?: string | null) {
  const value = (url || "").toLowerCase();
  if (value.includes("xiaohongshu") || value.includes("xhslink")) return "小红书";
  if (value.includes("weixin") || value.includes("wechat")) return "微信公众号";
  if (value.includes("douyin")) return "抖音";
  if (value.includes("bilibili")) return "B站";
  if (value.includes("weibo")) return "微博";
  if (value) return "网页";
  return "附件";
}

export function isMissingSchemaError(error: unknown) {
  const message = error instanceof Error ? error.message : JSON.stringify(error);
  return /schema cache|does not exist|could not find|PGRST20[45]|column .* not found/i.test(message);
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

