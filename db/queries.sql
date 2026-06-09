-- ============================================================
-- 일일 적재(ingest) 시 실행되는 쿼리 모음
-- 핵심: INSERT가 아니라 "UPSERT(있으면 갱신, 없으면 생성)"로 행 수를 고정
-- ============================================================

-- [market_data] 종목 시세 — 매일 같은 ticker 행을 덮어씀 (행 수 = 종목 수, 약 27개 고정)
INSERT INTO market_data (ticker, name, sector, exchange, price, change_pct, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(ticker) DO UPDATE SET
  name        = excluded.name,
  sector      = excluded.sector,
  exchange    = excluded.exchange,
  price       = excluded.price,
  change_pct  = excluded.change_pct,
  updated_at  = excluded.updated_at;

-- [macro_data] 거시 지표 — 매일 같은 metric_key 행을 덮어씀 (행 수 = 지표 수, 약 10개 고정)
INSERT INTO macro_data (metric_key, label, source, value, prev_value, change_value, change_unit, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(metric_key) DO UPDATE SET
  label         = excluded.label,
  source        = excluded.source,
  value         = excluded.value,
  prev_value    = excluded.prev_value,
  change_value  = excluded.change_value,
  change_unit   = excluded.change_unit,
  updated_at    = excluded.updated_at;

-- [news] 뉴스 — link UNIQUE라 같은 기사 재수집 시 자동 무시(중복 방지, 추가 write 절약)
INSERT INTO news (sector, title, link, source, published_at, fetched_at)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(link) DO NOTHING;

-- [news] 보관기간 정리 — "2일치까지만" 과부하 방지. 매 적재 직후 1회 실행
DELETE FROM news WHERE fetched_at < datetime('now', '-2 days');

-- [market_comment] 콜아웃 — 새 글 추가 후, 최신 1건만 남기고 정리 (히스토리 불필요)
INSERT INTO market_comment (summary, detail_json, created_at)
VALUES (?, ?, ?);

DELETE FROM market_comment
WHERE id NOT IN (SELECT id FROM market_comment ORDER BY created_at DESC LIMIT 1);

-- ============================================================
-- 대시보드(읽기 전용) 쿼리 — 페이지 렌더링 시 사용
-- ============================================================

-- 보유 종목 시세 전체
SELECT ticker, name, sector, exchange, price, change_pct, updated_at
FROM market_data
ORDER BY sector, ticker;

-- 거시 지표 전체
SELECT metric_key, label, source, value, prev_value, change_value, change_unit, updated_at
FROM macro_data;

-- 최근 2일 뉴스 (최신순)
SELECT id, sector, title, link, source, published_at, fetched_at
FROM news
ORDER BY fetched_at DESC;

-- 최신 시장 콜아웃
SELECT summary, detail_json, created_at
FROM market_comment
ORDER BY created_at DESC
LIMIT 1;
