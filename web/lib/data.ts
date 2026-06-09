import { db } from './db';
import type { DashboardData, MarketRow, MacroRow, NewsRow, CommentRow } from './types';

const MARKET_SECTOR = '전체'; // news.sector 값이 '전체'인 것 = 시장/경제 전반 뉴스

export async function getDashboardData(): Promise<DashboardData> {
  const conn = db();

  let marketRes, macroRes, newsRes, commentRes;
  try {
    [marketRes, macroRes, newsRes, commentRes] = await Promise.all([
      conn.execute('SELECT ticker, name, sector, exchange, price, change_pct, updated_at FROM market_data ORDER BY sector, ticker'),
      conn.execute('SELECT metric_key, label, source, value, prev_value, change_value, change_unit, updated_at FROM macro_data'),
      conn.execute('SELECT id, sector, title, link, source, published_at, fetched_at FROM news ORDER BY fetched_at DESC'),
      conn.execute('SELECT summary, detail_json, created_at FROM market_comment ORDER BY created_at DESC LIMIT 1'),
    ]);
  } catch {
    return { market: [], macro: [], marketNews: [], sectorNews: [], comment: null, generatedAt: new Date().toISOString() };
  }

  const market = marketRes.rows as unknown as MarketRow[];
  const macro = macroRes.rows as unknown as MacroRow[];
  const news = newsRes.rows as unknown as NewsRow[];
  const commentRow = (commentRes.rows[0] as unknown as CommentRow | undefined) ?? null;

  const marketNews = news.filter((n) => n.sector === MARKET_SECTOR);
  const sectorNews = news.filter((n) => n.sector !== MARKET_SECTOR);

  let comment: DashboardData['comment'] = null;
  if (commentRow) {
    let details: string[] = [];
    try {
      details = JSON.parse(commentRow.detail_json);
    } catch {
      details = [];
    }
    comment = { summary: commentRow.summary, details };
  }

  return {
    market,
    macro,
    marketNews,
    sectorNews,
    comment,
    generatedAt: new Date().toISOString(),
  };
}

export function macroByKey(macro: MacroRow[], key: string): MacroRow | undefined {
  return macro.find((m) => m.metric_key === key);
}
