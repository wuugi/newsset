import { getDashboardData, macroByKey } from '../lib/data';
import { formatChange, formatNumber, relativeTime } from '../lib/format';
import SectorNewsList from './components/SectorNewsList';

// 빌드 시 정적 생성 안 함 — 요청 시마다 Turso에서 실시간 조회
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function MacroRowView({ label, valueText, change, unit }: {
  label: string; valueText: string; change: number | null; unit: 'pct' | 'pp';
}) {
  const { text, cls } = formatChange(change, unit);
  return (
    <div className="macro-row">
      <div>
        <div className="macro-label">{label}</div>
        <div className={`macro-sub ${cls}`}>{text}</div>
      </div>
      <div className="macro-value">{valueText}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { market, macro, marketNews, sectorNews, comment } = data;

  const usdKrw = macroByKey(macro, 'usd_krw');
  const usdJpy = macroByKey(macro, 'usd_jpy');
  const jpyKrw = macroByKey(macro, 'jpy_krw');
  const dxy = macroByKey(macro, 'dxy');
  const krTreasury = macroByKey(macro, 'kr_treasury_3y');
  const us10y = macroByKey(macro, 'us_10y');
  const us2y = macroByKey(macro, 'us_2y');
  const goldOz = macroByKey(macro, 'gold_usd_oz');
  const goldGram = macroByKey(macro, 'gold_krw_g');
  const goldKg = macroByKey(macro, 'gold_krw_kg');

  const lastUpdated = market[0]?.updated_at ?? macro[0]?.updated_at ?? null;

  return (
    <>
      <header>
        <h1>📊 우기의 포폴 모니터링</h1>
        <p>{lastUpdated ? `${new Date(lastUpdated).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 기준 · 자동 업데이트` : '데이터 준비 중'}</p>
      </header>

      <div className="layout">
        {/* 좌측: 시장 코멘트 + 주요 뉴스 */}
        <div>
          {comment && (
            <div className="callout">
              <div className="callout-title">⚠️ 오늘의 시장 코멘트</div>
              <div className="callout-summary">{comment.summary}</div>
              {comment.details.length > 0 && (
                <details>
                  <summary>상세 분석 보기</summary>
                  <div className="callout-detail">
                    <ul>
                      {comment.details.map((d, i) => (
                        <li key={i} dangerouslySetInnerHTML={{ __html: d }} />
                      ))}
                    </ul>
                    <i>※ 본 코멘트는 자동 생성된 참고 의견이며, 투자 판단의 근거 자료로만 활용하고 최종 결정은 본인 책임 하에 신중히 내리시기 바랍니다.</i>
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="card">
            <h2>🌐 전체 시장 / 경제 주요 뉴스</h2>
            {marketNews.length === 0 && <div className="empty-state">수집된 뉴스가 없습니다.</div>}
            {marketNews.map((n) => (
              <div className="news-item" key={n.id}>
                <a href={n.link} target="_blank" rel="noreferrer">{n.title}</a>
                <div className="news-meta">{n.source ?? ''} · {relativeTime(n.fetched_at)}</div>
              </div>
            ))}
          </div>

          {/* 섹터별 뉴스 — 좌측 하단 */}
          <div className="card" style={{ padding: '18px 20px' }}>
            <h2>🏷️ 섹터별 주요 뉴스</h2>
            <SectorNewsList news={sectorNews} />
          </div>
        </div>

        {/* 우측: 환율/금리/금 시세 + 보유 종목 */}
        <div>
          <div className="card">
            <h2>💱 환율 · 달러 강세 지표</h2>
            {dxy && <MacroRowView label={`달러 인덱스 (${dxy.source})`} valueText={formatNumber(dxy.value)} change={dxy.change_value} unit="pct" />}
            {usdKrw && <MacroRowView label="달러/원 환율 (USD/KRW)" valueText={`${formatNumber(usdKrw.value)}원`} change={usdKrw.change_value} unit="pct" />}
            {usdJpy && <MacroRowView label="달러/엔 환율 (USD/JPY)" valueText={`${formatNumber(usdJpy.value)}엔`} change={usdJpy.change_value} unit="pct" />}
            {jpyKrw && <MacroRowView label="원/엔 환율 (100엔 기준, JPY/KRW)" valueText={`${formatNumber(jpyKrw.value)}원`} change={jpyKrw.change_value} unit="pct" />}
          </div>

          <div className="card">
            <h2>📜 금리 · 국채 수익률</h2>
            {krTreasury && (
              krTreasury.value !== null
                ? <MacroRowView label={`한국 국고채 3년물 (${krTreasury.source})`} valueText={`${formatNumber(krTreasury.value)}%`} change={krTreasury.change_value} unit="pp" />
                : <div className="macro-row"><div className="macro-label">한국 국고채 3년물 (BOK ECOS)</div><div className="macro-value" style={{ fontSize: 13, color: 'var(--muted)' }}>API 키 필요</div></div>
            )}
            {us10y && <MacroRowView label={`미국 10년물 국채금리 (${us10y.source})`} valueText={`${formatNumber(us10y.value)}%`} change={us10y.change_value} unit="pp" />}
            {us2y && <MacroRowView label={`미국 2년물 국채금리 (${us2y.source})`} valueText={`${formatNumber(us2y.value)}%`} change={us2y.change_value} unit="pp" />}
          </div>

          <div className="card">
            <h2>🥇 금 시세</h2>
            {goldOz && <MacroRowView label="국제 금 시세 (XAU/USD, 1oz)" valueText={`$${formatNumber(goldOz.value)}`} change={goldOz.change_value} unit="pct" />}
            {goldGram && <MacroRowView label="국내 금 환산가 (1g)" valueText={`${formatNumber(goldGram.value)}원`} change={goldGram.change_value} unit="pct" />}
            {goldKg && <MacroRowView label="국내 금 환산가 (1kg, 보유 수량)" valueText={`${formatNumber(goldKg.value)}원`} change={goldKg.change_value} unit="pct" />}
          </div>

          <div className="card">
            <h2>📈 보유 종목 등락 요약</h2>
            <table>
              <thead>
                <tr><th>종목</th><th>섹터</th><th className="num">종가</th><th className="num">등락률</th></tr>
              </thead>
              <tbody>
                {market.map((m) => {
                  const { text, cls } = formatChange(m.change_pct, 'pct');
                  const isUS = ['NASDAQ', 'NYSE', 'NYSEARCA'].includes(m.exchange ?? '');
                  const priceStr = m.price === null ? '-'
                    : isUS ? `$${formatNumber(m.price)}`
                    : `${formatNumber(m.price)}원`;
                  return (
                    <tr key={m.ticker}>
                      <td>{m.name}</td>
                      <td>{m.sector}</td>
                      <td className="num">{priceStr}</td>
                      <td className={`num ${cls}`}>{text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer>
        자동 생성된 페이지입니다 · 가격/환율/금 시세: Google Finance · 거시 지표: FRED / BOK ECOS · 뉴스: Google News RSS (공신력 있는 출처로 필터링) · 데이터는 매일 08:00 갱신됩니다
      </footer>
    </>
  );
}
