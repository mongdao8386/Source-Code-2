import Link from 'next/link';

// Root-level fallback (outside any locale). Middleware redirects real traffic
// to a locale-prefixed path, so this is rarely hit.
export default function RootNotFound() {
  return (
    <html lang="vi">
      <body
        style={{
          background: '#0a0a0b',
          color: '#f4f1ea',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ letterSpacing: '0.2em', color: '#a1a1a6' }}>404</p>
          <h1 style={{ marginTop: 12 }}>Không tìm thấy trang / Page not found</h1>
          <p style={{ marginTop: 16 }}>
            <Link href="/vi" style={{ color: '#c6a15b' }}>
              Trang chủ / Home
            </Link>
          </p>
        </div>
      </body>
    </html>
  );
}
