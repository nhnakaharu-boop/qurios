import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Qurioss', template: '%s | Qurioss' },
  description: '5分で解決。全国の講師とリアルタイムマッチングする学習SNS。脳科学が証明した授業設計。',
  keywords: ['学習', 'オンライン授業', '家庭教師', 'マッチング', '勉強', '受験'],
  openGraph: {
    title: 'Qurioss — 5分で解決する学習革命',
    description: '困った課題を投稿するだけで全国の講師が5分で解説。',
    url: 'https://qurio.jp',
    siteName: 'Qurioss',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F8FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0C10' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '10px',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
