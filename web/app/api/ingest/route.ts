import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/db';

type IngestPayload = {
  marketData?: Array<{
    ticker: string; name: string; sector: string; exchange?: string | null;
    price: number | null; changePct: number | null;
  }>;
  macroData?: Array<{
    metricKey: string; label: string; source: string;
    value: number | null; prevValue: number | null;
    changeValue: number | null; changeUnit: 'pct' | 'pp';
  }>;
  news?: Array<{
    sector: string; title: string; link: string;
    source?: string | null; publishedAt?: string | null;
  }>;
  comment?: { summary: string; details: string[] } | null;
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.INGEST_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: IngestPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const conn = db();
  const now = new Date().toISOString();
  const batch: { sql: string; args: unknown[] }[] = [];

  for (const m of body.marketData ?? []) {
    batch.push({
      sql: `INSERT INTO market_data (ticker, name, sector, exchange, price, change_pct, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ticker) DO UPDATE SET
              name = excluded.name,
              sector = excluded.sector,
              exchange = excluded.exchange,
              price = excluded.price,
              change_pct = excluded.change_pct,
              updated_at = excluded.updated_at`,
      args: [m.ticker, m.name, m.sector, m.exchange ?? null, m.price, m.changePct, now],
    });
  }

  for (const x of body.macroData ?? []) {
    batch.push({
      sql: `INSERT INTO macro_data (metric_key, label, source, value, prev_value, change_value, change_unit, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(metric_key) DO UPDATE SET
              label = excluded.label,
              source = excluded.source,
              value = excluded.value,
              prev_value = excluded.prev_value,
              change_value = excluded.change_value,
              change_unit = excluded.change_unit,
              updated_at = excluded.updated_at`,
      args: [x.metricKey, x.label, x.source, x.value, x.prevValue, x.changeValue, x.changeUnit, now],
    });
  }

  for (const n of body.news ?? []) {
    batch.push({
      sql: `INSERT INTO news (sector, title, link, source, published_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(link) DO NOTHING`,
      args: [n.sector, n.title, n.link, n.source ?? null, n.publishedAt ?? null, now],
    });
  }

  if (body.comment) {
    batch.push({
      sql: `INSERT INTO market_comment (summary, detail_json, created_at) VALUES (?, ?, ?)`,
      args: [body.comment.summary, JSON.stringify(body.comment.details ?? []), now],
    });
  }

  // 정리: 2일 지난 뉴스 삭제 + 콜아웃은 최신 1건만 유지 (free-tier 과부하 방지)
  batch.push({ sql: `DELETE FROM news WHERE fetched_at < datetime('now', '-2 days')`, args: [] });
  batch.push({
    sql: `DELETE FROM market_comment WHERE id NOT IN (SELECT id FROM market_comment ORDER BY created_at DESC LIMIT 1)`,
    args: [],
  });

  if (batch.length > 0) {
    await conn.batch(batch, 'write');
  }

  return NextResponse.json({ ok: true, written: batch.length });
}
