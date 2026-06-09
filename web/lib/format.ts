export function formatChange(value: number | null, unit: 'pct' | 'pp' = 'pct'): { text: string; cls: string } {
  if (value === null || Number.isNaN(value)) return { text: '-', cls: '' };
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '-';
  const cls = value > 0 ? 'pct-up' : value < 0 ? 'pct-down' : '';
  const suffix = unit === 'pp' ? '%p' : '%';
  return { text: `${arrow} ${Math.abs(value).toFixed(2)}${suffix}`, cls };
}

export function formatNumber(value: number | null, opts: Intl.NumberFormatOptions = {}): string {
  if (value === null || Number.isNaN(value)) return '-';
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2, ...opts });
}

export function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}
