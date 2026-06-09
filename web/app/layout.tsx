import './globals.css';

export const metadata = {
  title: '우기의 포폴 모니터링',
  description: '보유 종목 시세, 거시 지표, 섹터별 뉴스를 모아보는 데일리 대시보드',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
