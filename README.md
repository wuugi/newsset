# 우기의 포폴 모니터링

보유 종목 시세, 거시 지표, 섹터별 뉴스를 매일 자동으로 수집해 웹 대시보드로 보여주는 개인 포트폴리오 모니터링 시스템입니다.

## 전체 구조

```
[Google Apps Script]         [Vercel: /api/ingest]        [Turso DB]
 매일 08:00 자동 실행                                       market_data (시세)
  ├─ 시세 (GOOGLEFINANCE)       시크릿 검증                 macro_data (거시지표)
  ├─ 거시지표 (FRED/ECOS)  ───▶  UPSERT 적재       ───▶    news (2일 보관)
  ├─ 뉴스 (Google News RSS)     오래된 뉴스 자동 삭제       market_comment (콜아웃)
  └─ 시장 콜아웃 생성

[Vercel: 대시보드 페이지]
  Turso에서 데이터 읽기 → "우기의 포폴 모니터링" 렌더링
```

## 폴더 구조

```
stock-news-mailer/
├── Code.gs             # Google Apps Script (데이터 수집 + Vercel 적재)
├── db/
│   ├── schema.sql      # Turso DB 테이블 정의
│   ├── queries.sql     # UPSERT/cleanup 쿼리 모음
│   └── ARCHITECTURE.md # DB 설계 상세 설명
├── preview/
│   └── index.html      # 정적 HTML 미리보기 (가상 데이터)
└── web/                # Vercel 배포용 Next.js 앱
    ├── app/
    │   ├── page.tsx              # 대시보드 메인 페이지 (서버 컴포넌트)
    │   ├── layout.tsx
    │   ├── globals.css
    │   ├── api/ingest/route.ts   # Apps Script → Turso 적재 엔드포인트
    │   └── components/
    │       └── SectorNewsList.tsx # 섹터 필터 버튼 + 뉴스 리스트 (클라이언트 컴포넌트)
    ├── lib/
    │   ├── db.ts       # Turso 클라이언트
    │   ├── data.ts     # 대시보드 데이터 조회 함수
    │   ├── format.ts   # 숫자/등락률/시간 포맷 헬퍼
    │   └── types.ts    # 타입 정의
    └── package.json
```

## 보유 종목 목록

| Ticker | 종목명 | 섹터 | 거래소 |
|---|---|---|---|
| 071050 | 한국금융지주 | 금융/은행 | KRX |
| 001740 | SK네트웍스 | 산업재 | KRX |
| 360200 | ACE 미국S&P500 | 미국 대형 지수/ETF | KRX |
| 379800 | KODEX 미국S&P500 | 미국 대형 지수/ETF | KRX |
| 379810 | KODEX 미국나스닥100 | 미국 대형 지수/ETF | KRX |
| 0118S0 | SOL 미국넥스트테크TOP10액티브 | AI/반도체 | KRX |
| 497520 | ACE 일라이릴리밸류체인 | 제약/바이오 | KRX |
| 0048K0 | KODEX 차이나휴머노이드로봇 | 로보틱스/휴머노이드 | KRX |
| 0038A0 | KODEX 미국휴머노이드로봇 | 로보틱스/휴머노이드 | KRX |
| 114260 | KODEX 국고채3년 | 채권/금리 | KRX |
| 484790 | KODEX 미국30년국채액티브(H) | 채권/금리 | KRX |
| 442580 | PLUS 글로벌HBM반도체 | AI/반도체 | KRX |
| 0115C0 | RISE 미국고배당다우존스TOP10 | 미국 대형 지수/ETF | KRX |
| 486450 | SOL 미국AI전력인프라 | 에너지/전력 인프라 | KRX |
| 0023A0 | SOL 미국양자컴퓨팅TOP10 | 양자컴퓨팅 | KRX |
| PLTR | 팔란티어 | AI/반도체 | NASDAQ |
| MSFT | 마이크로소프트 | AI/반도체 | NASDAQ |
| IBM | IBM | 산업재 | NYSE |
| FTNT | 포티넷 | 산업재 | NASDAQ |
| MA | 마스터카드 | 소비재 | NYSE |
| KMB | 킴벌리클라크 | 소비재 | NYSE |
| ETN | 이턴 코퍼레이션 | 산업재 | NYSE |
| UMC | UMC(ADR) | 반도체 파운드리 | NYSE |
| ROBO | ROBO Global Robotics | 로보틱스/휴머노이드 | NASDAQ |
| QLD | QLD | 미국 대형 지수/ETF | NASDAQ |
| VGIT | VGIT | 채권/금리 | NASDAQ |
| 2638 | Global X Japan Robotics & AI | 로보틱스/휴머노이드 | TYO |

## 거시 지표 데이터 소스

| 지표 | 소스 | API 키 |
|---|---|---|
| 달러/원, 달러/엔, 금 시세 | Google Finance (`GOOGLEFINANCE`) | 불필요 |
| 원/엔 (100엔 기준) | USD/KRW ÷ USD/JPY × 100 교차계산 | - |
| 달러 인덱스 (DXY) | FRED `DTWEXBGS` (연준 무역가중 달러지수) | 불필요 |
| 미국 10년/2년 국채금리 | FRED `DGS10`, `DGS2` | 불필요 |
| 한국 국고채 3년물 | 한국은행 ECOS Open API (`817Y002`) | 무료 발급 필요 |

## 설치 및 배포 순서

### 1. Google Apps Script 설정

1. https://sheet.new 에서 새 Google Sheets 생성
2. `확장 프로그램 > Apps Script` 열기
3. `Code.gs` 내용 붙여넣기
4. `CONFIG` 상단 값 확인:
   - `RECIPIENT_EMAIL`: 본인 Gmail 주소
   - `ECOS_API_KEY`: 한국은행 ECOS API 키 ([무료 발급](https://ecos.bok.or.kr/api/#/MyOpenApi/MyApiList))
   - `INGEST_URL`: Vercel 배포 후 입력 (`https://your-app.vercel.app/api/ingest`)
   - `INGEST_SECRET`: Vercel 환경변수 `INGEST_SECRET`과 동일한 값
5. `setup()` 함수 1회 실행 → 종목 시트 자동 생성
6. `createDailyTrigger()` 1회 실행 → 매일 08:00 자동 실행 등록

### 2. Turso DB

```bash
turso db create woogi-portfolio
turso db shell woogi-portfolio < db/schema.sql
turso db show woogi-portfolio          # URL 확인
turso db tokens create woogi-portfolio # Auth Token 발급
```

> DB URL: `libsql://woogi-portfolio-wuugi.aws-ap-northeast-1.turso.io`
> (이미 생성 및 스키마 적용 완료)

### 3. Vercel 배포

1. https://vercel.com/new 에서 `wuugi/newsset` 저장소 import
2. **Root Directory** → `web` 으로 설정 (필수!)
3. 환경변수 3개 등록:

| 변수명 | 값 |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://woogi-portfolio-wuugi.aws-ap-northeast-1.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso에서 발급한 토큰 |
| `INGEST_SECRET` | 임의의 시크릿 문자열 (Apps Script `CONFIG.INGEST_SECRET`과 동일) |

4. Deploy 후 생성된 URL을 `Code.gs`의 `CONFIG.INGEST_URL`에 입력

### 4. 데이터 첫 적재 확인

Apps Script에서 `sendDailyReport()` 수동 1회 실행
→ Vercel `/api/ingest`로 데이터 전송 → Turso에 저장 → 대시보드에서 확인

## 자주 묻는 것

- **`GOOGLEFINANCE`가 `#N/A` 반환** → `GoogleFinanceExchange` 값을 바꾸거나 비워보세요
- **한국 금리가 "API 키 필요"로 표시** → `Code.gs`의 `CONFIG.ECOS_API_KEY`에 키 입력
- **뉴스가 안 보임** → 2일이 지난 뉴스는 자동 삭제됩니다 (정상 동작)
- **대시보드가 오래된 데이터 표시** → 최대 30분 캐시 적용 (`revalidate = 1800`), 강제 새로고침은 Vercel 대시보드에서 Redeploy
