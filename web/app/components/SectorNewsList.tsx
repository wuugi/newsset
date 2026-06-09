'use client';

import { useMemo, useState } from 'react';
import type { NewsRow } from '../../lib/types';
import { relativeTime } from '../../lib/format';

const ALL = '전체';

export default function SectorNewsList({ news }: { news: NewsRow[] }) {
  const sectors = useMemo(() => {
    const set = new Set<string>();
    news.forEach((n) => set.add(n.sector));
    return [ALL, ...Array.from(set)];
  }, [news]);

  const [active, setActive] = useState(ALL);
  const filtered = active === ALL ? news : news.filter((n) => n.sector === active);

  return (
    <>
      <div className="filter-bar">
        {sectors.map((s) => (
          <button
            key={s}
            className={`filter-btn${s === active ? ' active' : ''}`}
            onClick={() => setActive(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="news-list">
        {filtered.length === 0 && <div className="empty-state">표시할 뉴스가 없습니다.</div>}
        {filtered.map((n) => (
          <div className="news-row" key={n.id}>
            <span className="sector-tag">{n.sector}</span>
            <a href={n.link} target="_blank" rel="noreferrer">{n.title}</a>
            <span className="news-meta">{n.source ?? ''} · {relativeTime(n.fetched_at)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
