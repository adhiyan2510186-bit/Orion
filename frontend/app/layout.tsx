import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FloatChat — ARGO 4D Explorer',
  description:
    'Natural-language query and 4D visualisation over real ARGO oceanographic float data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
