# 우기의 포폴 모니터링 — 웹 대시보드 (Next.js + Turso + Vercel)

`Code.gs`가 매일 08:00에 수집한 데이터를 Turso DB에 적재하고, 이 앱이 그 데이터를
읽어 `preview/index.html`과 동일한 레이아웃으로 렌더링합니다.

전체 아키텍처/스키마 설명은 [`../db/ARCHITECTURE.md`](../db/ARCHITECTURE.md),
[`../db/schema.sql`](../db/schema.sql) 참고.

## 1. Turso DB 준비

```bash
turso db create woogi-portfolio
turso db shell woogi-portfolio < ../db/schema.sql
turso db show woogi-portfolio          # URL 확인
turso db tokens create woogi-portfolio  # AUTH_TOKEN 발급
```

## 2. 환경 변수

`.env.example`을 `.env.local`로 복사 후 값 채우기:

```
TURSO_DATABASE_URL=libsql://woogi-portfolio-xxxx.turso.io
TURSO_AUTH_TOKEN=...
INGEST_SECRET=임의의-긴-랜덤-문자열
```

Vercel 프로젝트에도 동일한 3개 변수를 **Production/Preview 환경변수**로 등록합니다.

## 3. 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 대시보드 확인. DB에 아직 데이터가 없으면
빈 상태(empty-state)로 표시됩니다 — 4번 단계로 한 번 적재해보세요.

## 4. Apps Script 연동

1. Vercel 배포 후 `https://<your-app>.vercel.app/api/ingest` 주소 확인
2. `Code.gs`의 `CONFIG.INGEST_URL`에 위 주소를, `CONFIG.INGEST_SECRET`에 `.env.local`의
   `INGEST_SECRET`과 동일한 값을 입력
3. `sendDailyReport`를 한 번 수동 실행 → Turso에 데이터가 채워지는지 확인
   (Turso CLI에서 `select * from market_data;` 등으로 확인 가능)

## 5. Vercel 배포

GitHub 저장소에 push 후 Vercel에서 Import — `web/` 디렉터리를
프로젝트 루트(Root Directory)로 지정하면 됩니다. `next build`가 자동 실행됩니다.

## 6. 데이터 갱신 주기

- 적재: Apps Script 트리거(매일 08:00 KST)가 `/api/ingest`로 POST
- 화면: `app/page.tsx`의 `revalidate = 1800` (30분)으로 ISR 캐싱 — Turso read 횟수를
  절약하면서도 충분히 최신 데이터를 보여줍니다. 트래픽이 적다면 값을 늘려도 무방합니다.
