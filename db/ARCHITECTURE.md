# DB/배포 아키텍처 — Turso + Vercel

## 1. 전체 흐름

기존에 만든 `Code.gs`의 데이터 수집 로직(시세·거시지표·뉴스·콜아웃 생성)을 **그대로 재사용**하고,
Google Apps Script의 시간 기반 트리거(매일 08:00)가 수집을 마친 뒤 결과를 JSON으로
Vercel의 적재용 API 엔드포인트에 `POST` → 그 핸들러가 Turso에 기록하는 구조입니다.

```
[Google Apps Script]                [Vercel: /api/ingest]            [Turso DB]
 매일 08:00 트리거                                                     market_data
   ├─ 시세 수집 (GOOGLEFINANCE)        시크릿 검증                     macro_data
   ├─ 거시지표 수집 (FRED/ECOS)   ──▶  UPSERT 실행          ──▶       news
   ├─ 뉴스 수집 (Google News RSS)      news 중복 무시(link UNIQUE)     market_comment
   └─ 콜아웃 생성                       2일 지난 news DELETE
        │  UrlFetchApp.fetch(POST, JSON, Authorization: Bearer secret)
        ▼
   (이미 동작 검증된 fetch 로직 재사용 — 새로 만들 코드 최소화)

[Vercel: 대시보드 페이지]
  요청 시 Turso에서 SELECT → "우기의 포폴 모니터링" 렌더링
```

**왜 이렇게 하나?**
- Vercel Cron을 새로 설계/디버깅할 필요 없이, 이미 검증된 Apps Script 트리거(8시 정시 실행)를 그대로 스케줄러로 활용
- `GOOGLEFINANCE`, FRED CSV, BOK ECOS 호출 로직을 한 곳(Apps Script)에만 유지 → 유지보수 포인트 최소화
- Vercel 쪽은 "받아서 DB에 쓰기"와 "DB에서 읽어 렌더링"만 담당하는 단순한 역할로 축소

## 2. Turso 무료 티어를 고려한 설계 포인트

Turso 무료(Starter) 플랜은 데이터베이스 개수·총 저장 용량·월간 row 읽기/쓰기 건수에
상한이 있습니다. 이 프로젝트의 적재 패턴을 한도 안에 안전하게 두기 위해:

1. **시세·거시지표는 "latest-only" 구조** (`market_data`, `macro_data`)
   - 매일 새 행을 추가(INSERT)하는 대신 `ON CONFLICT(...) DO UPDATE`로 **같은 행을 덮어씀**
   - 결과적으로 테이블 행 수가 "종목 수(~27)" / "지표 수(~10)"로 **영구히 고정** → 저장 용량이 시간이 지나도 늘지 않음
   - 하루 1회, 약 40건 내외의 UPSERT만 발생 → 월 환산해도 수천 건 수준으로 무료 한도 대비 매우 여유로움

2. **뉴스는 2일 롤링 보관** (`news`)
   - 적재 직후 `DELETE FROM news WHERE fetched_at < datetime('now','-2 days')` 실행 → 테이블이 일정 크기 이상 커지지 않음
   - `link UNIQUE` + `ON CONFLICT(link) DO NOTHING`으로 같은 기사가 재수집돼도 중복 저장/추가 write가 발생하지 않음

3. **콜아웃은 최신 1건만 유지** (`market_comment`)
   - 매일 새로 생성하되, 직후 "최신 1건 제외 전부 삭제" 쿼리로 정리 → 누적 방지

4. **읽기(read) 비용 최소화**
   - 대시보드는 4개 테이블에 대해 단순 `SELECT`만 수행 (페이지뷰당 4쿼리)
   - 트래픽이 적은 개인용 대시보드 특성상 월간 read 건수도 무료 한도에 비해 미미함
   - 필요 시 Vercel의 ISR(예: `revalidate: 1800`)로 캐싱하면 동일 데이터를 반복 조회하지 않아 read도 더 절감 가능

> 결론: 모든 테이블을 "고정 크기(latest-only) 또는 짧은 롤링 윈도우"로 설계했기 때문에
> 시간이 지나도 저장 용량과 일일 write 건수가 거의 일정하게 유지됩니다 — 무료 티어 안에서
> 안정적으로 운영 가능한 구조입니다.

## 3. 적재 API (`/api/ingest`) 예시 — Vercel Serverless Function (TypeScript)

```ts
// app/api/ingest/route.ts  (Next.js App Router 기준)
import { createClient } from '@libsql/client';
import { NextRequest, NextResponse } from 'next/server';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function POST(req: NextRequest) {
  // Apps Script에서 보낸 시크릿 검증 (외부에서 함부로 쓰기 못하도록)
  if (req.headers.get('authorization') !== `Bearer ${process.env.INGEST_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  const batch = [];

  for (const m of body.marketData ?? []) {
    batch.push({
      sql: `INSERT INTO market_data (ticker, name, sector, exchange, price, change_pct, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(ticker) DO UPDATE SET
              name=excluded.name, sector=excluded.sector, exchange=excluded.exchange,
              price=excluded.price, change_pct=excluded.change_pct, updated_at=excluded.updated_at`,
      args: [m.ticker, m.name, m.sector, m.exchange, m.price, m.changePct, now],
    });
  }

  for (const x of body.macroData ?? []) {
    batch.push({
      sql: `INSERT INTO macro_data (metric_key, label, source, value, prev_value, change_value, change_unit, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(metric_key) DO UPDATE SET
              label=excluded.label, source=excluded.source, value=excluded.value,
              prev_value=excluded.prev_value, change_value=excluded.change_value,
              change_unit=excluded.change_unit, updated_at=excluded.updated_at`,
      args: [x.metricKey, x.label, x.source, x.value, x.prevValue, x.changeValue, x.changeUnit, now],
    });
  }

  for (const n of body.news ?? []) {
    batch.push({
      sql: `INSERT INTO news (sector, title, link, source, published_at, fetched_at)
            VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(link) DO NOTHING`,
      args: [n.sector, n.title, n.link, n.source, n.publishedAt, now],
    });
  }

  if (body.comment) {
    batch.push({
      sql: `INSERT INTO market_comment (summary, detail_json, created_at) VALUES (?, ?, ?)`,
      args: [body.comment.summary, JSON.stringify(body.comment.details), now],
    });
  }

  // 정리(cleanup): 2일 지난 뉴스 삭제 + 콜아웃은 최신 1건만 유지
  batch.push({ sql: `DELETE FROM news WHERE fetched_at < datetime('now', '-2 days')`, args: [] });
  batch.push({
    sql: `DELETE FROM market_comment WHERE id NOT IN (SELECT id FROM market_comment ORDER BY created_at DESC LIMIT 1)`,
    args: [],
  });

  await db.batch(batch, 'write');

  return NextResponse.json({ ok: true });
}
```

## 4. Apps Script에서 적재 트리거 호출하는 함수 (Code.gs에 추가)

기존 `sendDailyReport()`가 이미 만들어둔 `priceRows`, `macro`, `sectorNews`, `marketNews`,
콜아웃 데이터를 그대로 JSON으로 묶어 전송하면 됩니다.

```javascript
function publishToWeb_(macro, priceRows, sectorNews, marketNews, comment) {
  const payload = {
    marketData: priceRows.map(r => ({
      ticker: r.ticker, name: r.name, sector: r.sector, exchange: r.exchange,
      price: r.price, changePct: r.changePct,
    })),
    macroData: macroToRows_(macro), // 거시지표 객체를 {metricKey,label,source,value,...} 배열로 변환
    news: [...marketNews, ...sectorNews].map(n => ({
      sector: n.sector || '전체', title: n.title, link: n.link,
      source: n.source, publishedAt: n.publishedAt,
    })),
    comment: comment ? { summary: comment.summary, details: comment.details } : null,
  };

  UrlFetchApp.fetch(CONFIG.INGEST_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CONFIG.INGEST_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
```

`CONFIG`에 `INGEST_URL`(예: `https://your-app.vercel.app/api/ingest`)과
`INGEST_SECRET`(Vercel 환경변수 `INGEST_SECRET`과 동일한 임의 문자열)을 추가하고,
`sendDailyReport()` 마지막에 `publishToWeb_(...)` 호출을 추가하면 메일 발송과 동시에
웹 대시보드용 데이터도 갱신됩니다.

## 5. 환경변수 정리 (Vercel)

| 변수 | 용도 |
|---|---|
| `TURSO_DATABASE_URL` | Turso DB 연결 URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso 인증 토큰 |
| `INGEST_SECRET` | Apps Script ↔ Vercel 간 적재 요청 인증용 임의 시크릿 |

## 6. 다음 단계 제안

1. Turso CLI/대시보드에서 새 DB 생성 후 `schema.sql` 실행 (`turso db shell <db-name> < schema.sql`)
2. Vercel 프로젝트에 위 3개 환경변수 등록
3. `/api/ingest` 라우트 + 대시보드 페이지(SELECT 후 `preview/index.html` 레이아웃 그대로 렌더링) 구현
4. `Code.gs`에 `publishToWeb_` 추가 후 수동 1회 실행 → Turso에 데이터 쌓이는지 확인
5. ECOS 인증키는 추후 발급해 `CONFIG.ECOS_API_KEY`에 채우면, 다음 적재부터 `kr_treasury_3y` 값이 자동으로 채워짐 (스키마 변경 불필요)
