import type { ReactNode } from 'react';

// The real <html>/<body> live in src/app/[locale]/layout.tsx so the lang
// attribute and messages can be locale-aware. This root only satisfies the
// Next.js requirement that an app/layout exists.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
