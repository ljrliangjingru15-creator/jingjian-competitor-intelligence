export type CollectionStatus = "pending" | "identified" | "failed";
export type ReviewStatus = "pending" | "approved" | "ignored" | "merged";
export type AnalysisStatus = "pending" | "processing" | "completed" | "failed" | "quota_exceeded" | "model_unavailable";
export type HumanReviewStatus = "pending" | "reviewed" | "modified" | "not_required";
export type ReportStatus = "unused" | "selected" | "cited" | "excluded";

export type Competitor = {
  id: string;
  name: string;
  english_name?: string | null;
  type?: string | null;
  city?: string | null;
  region?: string | null;
  campus?: string | null;
  headquarters?: string | null;
  key_markets?: string[];
  is_key?: boolean;
  monitoring_enabled?: boolean;
  aliases?: Array<{id: string; alias: string}>;
};

export type MaterialRecord = {
  id: string;
  evidence_id?: string | null;
  competitor_id?: string | null;
  original_organization?: string | null;
  title: string;
  source_url?: string | null;
  normalized_url?: string | null;
  platform?: string | null;
  account_name?: string | null;
  published_at?: string | null;
  raw_text?: string | null;
  note?: string | null;
  focus_points?: string | null;
  content_type?: string | null;
  tag?: string | null;
  theme_tags?: string[];
  audience_tags?: string[];
  product_lines?: string[];
  source_type?: string | null;
  collection_status?: CollectionStatus;
  review_status?: ReviewStatus;
  analysis_status?: AnalysisStatus;
  human_review_status?: HumanReviewStatus;
  report_status?: ReportStatus;
  is_new?: boolean;
  import_job_id?: string | null;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
  competitors?: {name: string} | null;
  material_assets?: MaterialAsset[];
};

export type MaterialAsset = {
  id: string;
  material_id: string;
  object_path: string;
  filename: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  sort_order?: number;
  is_primary?: boolean;
};

export type StructuredAnalysis = {
  facts: {
    products: string[];
    activities: string[];
    prices: string[];
    offers: string[];
    audiences: string[];
    regions: string[];
    results: string[];
    people: string[];
    ctas: string[];
    promises: string[];
  };
  content_tags: string[];
  marketing_strategies: string[];
  target_audiences: string[];
  conversion_path: string[];
  strategy_signals: string[];
  actions: string[];
  evidence_ids: string[];
  confidence: number;
};

export const emptyAnalysis = (evidenceId?: string | null): StructuredAnalysis => ({
  facts: {products: [], activities: [], prices: [], offers: [], audiences: [], regions: [], results: [], people: [], ctas: [], promises: []},
  content_tags: [], marketing_strategies: [], target_audiences: [], conversion_path: [], strategy_signals: [], actions: [],
  evidence_ids: evidenceId ? [evidenceId] : [], confidence: 0.25,
});

export const stateLabels: Record<string, string> = {
  pending: "待处理", identified: "已识别", approved: "已入库", ignored: "已忽略", merged: "已合并",
  processing: "分析中", completed: "已完成", failed: "失败", quota_exceeded: "额度不足", model_unavailable: "模型不可用",
  reviewed: "已复核", modified: "已修改", not_required: "无需复核", unused: "未使用", selected: "已选用", cited: "已引用", excluded: "已排除",
};

