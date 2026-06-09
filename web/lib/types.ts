export type MarketRow = {
  ticker: string;
  name: string;
  sector: string;
  exchange: string | null;
  price: number | null;
  change_pct: number | null;
  updated_at: string;
};

export type MacroRow = {
  metric_key: string;
  label: string;
  source: string;
  value: number | null;
  prev_value: number | null;
  change_value: number | null;
  change_unit: 'pct' | 'pp';
  updated_at: string;
};

export type NewsRow = {
  id: number;
  sector: string;
  title: string;
  link: string;
  source: string | null;
  published_at: string | null;
  fetched_at: string;
};

export type CommentRow = {
  summary: string;
  detail_json: string;
  created_at: string;
};

export type DashboardData = {
  market: MarketRow[];
  macro: MacroRow[];
  marketNews: NewsRow[];
  sectorNews: NewsRow[];
  comment: { summary: string; details: string[] } | null;
  generatedAt: string;
};
