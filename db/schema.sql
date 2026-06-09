-- ============================================================
-- 우기의 포폴 모니터링 — Turso(libSQL) 스키마
-- 설계 원칙: "행 수를 거의 고정"시켜 무료 티어의 storage/row 사용량을 최소화
--   1) 시세·거시지표 = latest-only 구조 → 종목/지표당 1행만 유지하고 매일 UPSERT
--   2) 뉴스 = 2일 롤링 보관 → 적재 후 오래된 행 DELETE로 자동 정리
-- ============================================================

-- 1) 보유 종목 시세 스냅샷 (종목당 1행, 매일 UPSERT)
CREATE TABLE IF NOT EXISTS market_data (
  ticker      TEXT PRIMARY KEY,        -- 예: '071050', 'PLTR'
  name        TEXT NOT NULL,
  sector      TEXT NOT NULL,
  exchange    TEXT,                    -- KRX/NASDAQ/NYSE/TYO ...
  price       REAL,
  change_pct  REAL,                    -- 전일 대비 등락률(%)
  updated_at  TEXT NOT NULL            -- ISO datetime, 마지막 갱신 시각
);

-- 2) 거시 지표 스냅샷 (지표당 1행, 매일 UPSERT)
--    환율/달러인덱스/금리/금시세 등 — metric_key로 종류 구분
CREATE TABLE IF NOT EXISTS macro_data (
  metric_key    TEXT PRIMARY KEY,      -- 'usd_krw' | 'usd_jpy' | 'jpy_krw' | 'dxy'
                                        -- | 'us_10y' | 'us_2y' | 'kr_treasury_3y'
                                        -- | 'gold_usd_oz' | 'gold_krw_g' | 'gold_krw_kg'
  label         TEXT NOT NULL,         -- 화면 표시용 한글 라벨
  source        TEXT NOT NULL,         -- 'GOOGLEFINANCE' | 'FRED:DTWEXBGS' | 'BOK_ECOS' ...
  value         REAL,
  prev_value    REAL,                  -- 직전 영업일 값 (변화량 계산용)
  change_value  REAL,                  -- value - prev_value, 또는 (value-prev)/prev*100
  change_unit   TEXT NOT NULL DEFAULT 'pct',  -- 'pct'(%) | 'pp'(%p, 금리류)
  updated_at    TEXT NOT NULL
);

-- 3) 섹터/시장 뉴스 — 최근 2일치만 보관 (매 적재 후 cleanup 쿼리로 정리)
CREATE TABLE IF NOT EXISTS news (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sector        TEXT NOT NULL,         -- '전체'(시장/경제) 또는 섹터명
  title         TEXT NOT NULL,
  link          TEXT NOT NULL UNIQUE,  -- 동일 기사 중복 적재 방지
  source        TEXT,                  -- 매체명 (Reuters, 한국경제 ...)
  published_at  TEXT,
  fetched_at    TEXT NOT NULL          -- 수집 시각, 보관기간 판단 기준
);
CREATE INDEX IF NOT EXISTS idx_news_fetched_at ON news (fetched_at);
CREATE INDEX IF NOT EXISTS idx_news_sector     ON news (sector);

-- 4) 시장 상황 콜아웃 (최신 1건만 사용, 과거분은 정리)
CREATE TABLE IF NOT EXISTS market_comment (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  summary      TEXT NOT NULL,          -- 3문장 이내 요약 (콜아웃 본문)
  detail_json  TEXT NOT NULL,          -- 상세 근거, JSON 배열 문자열로 저장 → '접기'에서 렌더
  created_at   TEXT NOT NULL
);
