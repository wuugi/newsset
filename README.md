# 데일리 주식 등락 + 섹터 뉴스 메일 봇 (Google Apps Script)

매일 아침 8시(한국시간)에
1. 보유 종목의 종가/등락률
2. 섹터별 + 전체 시장/경제 주요 뉴스(공신력 있는 출처만, 글로벌 포함)

를 정리해서 Gmail로 보내주는 자동화입니다.
가격은 **Google Finance**, 뉴스는 **Google News RSS**(주요 매체로 필터링)를 사용하므로 별도 유료 API 키가 필요 없습니다.

## 1. 설치

1. https://sheet.new 로 새 Google Sheet 생성
2. 메뉴 `확장 프로그램 > Apps Script` 클릭
3. 기본 `Code.gs` 내용을 모두 지우고 이 폴더의 [`Code.gs`](Code.gs) 내용을 붙여넣기
4. 코드 상단 `CONFIG.RECIPIENT_EMAIL` 을 본인 메일 주소로 변경
5. 함수 선택 드롭다운에서 `setup` 선택 후 ▶ 실행 → 권한 승인(Google 계정 인증)
   - 이때 시트에 `CONFIG` 탭이 생기고 예시 종목이 채워집니다
6. `CONFIG` 시트를 열어 **본인의 실제 보유 종목으로 교체** (아래 2번 표 참고)
7. 다시 Apps Script로 돌아와 `createDailyTrigger` 함수를 1회 실행
   → 매일 오전 8시(Asia/Seoul)에 `sendDailyReport`가 자동 실행되도록 트리거 등록됨
   (또는 좌측 시계 아이콘 `트리거` 메뉴에서 직접 등록해도 됩니다)
8. 테스트로 `sendDailyReport`를 한 번 수동 실행해 메일이 잘 오는지 확인하세요

## 2. CONFIG 시트에 입력할 종목 목록

스크린샷에 보이는 모든 보유 종목(일반계좌·연금저축·ISA 포함, 중복 종목은 한 줄로
정리)의 티커를 웹 검색으로 직접 조회해서 채워 넣었습니다. `Code.gs`의 `setup()`을
실행하면 아래 내용이 `CONFIG` 시트에 그대로 채워집니다 — 별도 입력이 필요 없습니다.

| Ticker | Name | Sector | GoogleFinanceExchange |
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
| MA | 마스타카드 | 소비재 | NYSE |
| KMB | 킴벌리클라크 | 소비재 | NYSE |
| ETN | 이턴 코퍼레이션 | 산업재 | NYSE |
| UMC | UMC(ADR) | 반도체 파운드리 | NYSE |
| ROBO | ROBO Global Robotics and Automation | 로보틱스/휴머노이드 | NASDAQ |
| QLD | QLD | 미국 대형 지수/ETF | NASDAQ |
| VGIT | VGIT | 채권/금리 | NASDAQ |
| 2638 | Global X Japan Robotics & AI | 로보틱스/휴머노이드 | TYO |

> 중복 보유(예: KODEX 미국S&P500이 일반계좌+ISA에, ACE 일라이릴리밸류체인이
> 일반계좌+ISA에 모두 있음)는 한 줄만 넣었습니다. 메일은 "계좌별 잔고"가 아니라
> "종목별 시세/뉴스" 요약이기 때문입니다.
>
> ⚠️ 코드값 중 `0118S0`, `0048K0`, `0038A0`, `0115C0`, `0023A0` 처럼 영문+숫자가
> 섞인 신규 ETF 코드는 출시된 지 얼마 안 돼 `GOOGLEFINANCE`가 아직 인식하지
> 못할 수 있습니다. 만약 `#N/A`가 뜨면 시트에서 `GoogleFinanceExchange` 칸을
> 비우거나 `KRX:` 접두사를 빼고 코드만 입력해보세요. 그래도 안 되면 해당 ETF는
> 가격 조회를 건너뛰고 뉴스만 받아보는 방식으로 운영하는 걸 권장합니다(시트에서
> 해당 행을 삭제하면 가격표에서 빠지고 섹터 뉴스는 다른 종목들로 계속 옵니다).

## 3. 섹터/뉴스 키워드 커스터마이징

`Code.gs`의 `SECTOR_KEYWORDS` 객체에서 섹터별 검색 키워드를 자유롭게 수정할 수
있습니다. `CONFIG` 시트의 `Sector` 열 값과 키 이름이 일치해야 해당 키워드가
적용됩니다(일치하지 않으면 섹터명 자체로 검색).

`TRUSTED_SOURCES` 배열에는 신뢰도 높은 매체만 등록되어 있습니다
(Reuters, Bloomberg, WSJ, FT, AP, CNBC, 한국경제, 매일경제, 연합뉴스).
필요하면 추가/삭제하세요.

## 4. 거시 지표 데이터 소스 (안정성 기준으로 선정)

| 지표 | 소스 | API 키 | 비고 |
|---|---|---|---|
| 달러/원, 달러/엔, 국제 금 시세 | Google Finance (`GOOGLEFINANCE`) | 불필요 | 시트 내장 함수라 가장 간단·안정적 |
| 원/엔(100엔 기준) | (위 두 환율로 계산) `USDKRW ÷ USDJPY × 100` | - | 공식 크로스환율 산식과 동일 |
| **달러 인덱스 (DXY)** | **FRED `DTWEXBGS`** (연준 무역가중 달러지수) | **불필요** | `fredgraph.csv?id=DTWEXBGS` CSV를 직접 파싱. 시중에서 말하는 "ICE DXY"와 수치는 다르지만(추종 바스켓이 다름), **연준 공식 통계라 가장 신뢰도가 높고 무료·무인증으로 안정적**입니다. ICE DXY 자체를 원하면 stooq `dx.f` 심볼로 대체 가능(비공식, 변경 가능성 있음) |
| **미국 10년/2년 국채금리** | **FRED `DGS10`, `DGS2`** | **불필요** | 동일하게 `fredgraph.csv` CSV 다운로드. 세인트루이스 연은이 매일 갱신하는 공식 시계열로, 무료 API 중 가장 권위 있고 변경 위험이 낮음 |
| **한국 국고채 3년물 금리** | **한국은행 ECOS Open API** (`StatisticSearch`, 통계표 817Y002 / 항목 010210000) | **필요(무료)** | https://ecos.bok.or.kr/api/#/MyOpenApi/MyApiList 에서 회원가입 후 즉시 발급. 한국 금리는 이 데이터가 사실상 유일한 공신력 있는 무료 출처입니다. `Code.gs`의 `CONFIG.ECOS_API_KEY`에 발급받은 키를 넣으면 동작하고, 비워두면 "API 키 필요"로만 표시됩니다 |

> **선정 기준**: ① 무료/무료 등록, ② 공식 기관(연준·한국은행) 또는 구글 시트 내장 함수처럼 변경 가능성이 낮은 출처, ③ 별도 인증 없이 CSV/JSON으로 바로 파싱 가능한 형태 — 이 세 가지를 우선했습니다. stooq/Yahoo Finance 같은 비공식 소스는 무료지만 약관·형식이 자주 바뀌는 편이라 가능한 한 배제했습니다.

`fetchFredLatestAndPrev_(seriesId)`와 `fetchKoreaTreasuryYield_()`가 각각의 호출을 담당하며, 실패 시 `null`을 반환해 메일이 깨지지 않도록 처리했습니다.

## 5. 동작 원리 요약

- **가격**: Apps Script에서 `GOOGLEFINANCE` 함수를 직접 호출할 수 없어서,
  숨김 시트(`_PRICE_HELPER`)에 수식을 넣고 계산된 값을 읽어오는 방식을 씁니다
  (`buildPriceRow_`). 전일 종가 대비 등락률(%)을 계산합니다.
- **뉴스**: Google News RSS 검색(`news.google.com/rss/search`)에 섹터 키워드 +
  신뢰 매체 `site:` 필터를 조합한 쿼리를 보내 상위 N개 기사를 가져옵니다.
- **메일**: `GmailApp.sendEmail`로 HTML 메일 발송 (발신: 본인 Gmail 계정).

## 6. 웹 대시보드 (우기의 포폴 모니터링)

메일 대신/추가로 웹 대시보드 형태로도 볼 수 있게 구성했습니다.

- `preview/index.html` — 가상 데이터로 만든 레이아웃 미리보기 (배포 전 디자인 확정용)
- `db/` — Turso(libSQL) 스키마·적재 쿼리·전체 아키텍처 설명 ([`ARCHITECTURE.md`](db/ARCHITECTURE.md))
- `web/` — 실제 배포용 Next.js 앱 (Turso에서 데이터를 읽어 렌더링, `/api/ingest`로 적재)

흐름: `Code.gs`가 매일 08:00에 수집한 데이터를 `web/api/ingest`로 POST →
Turso DB에 UPSERT(시세·거시지표) / 2일 보관(뉴스) → Next.js 페이지가 Turso를 읽어
대시보드를 렌더링 → Vercel에 배포. 자세한 설정 순서는 [`web/README.md`](web/README.md) 참고.

## 7. 자주 발생할 수 있는 이슈

- `GOOGLEFINANCE`가 일부 ETF/해외 티커에 대해 `#N/A`를 반환할 수 있습니다 →
  `CONFIG` 시트에서 `GoogleFinanceExchange` 값을 비워두거나 다른 거래소 코드로
  시도해보세요(예: 일부 ADR은 `NYSE` 대신 `NYSEARCA`).
- 처음 실행 시 "승인되지 않은 앱" 경고가 뜨면 `고급 > (프로젝트명)으로 이동`을
  눌러 본인 계정으로 승인하면 됩니다(본인이 만든 스크립트이므로 안전).
- 메일이 스팸함으로 분류되면 발신 주소를 수신함 "스팸 아님"으로 표시해두세요.
