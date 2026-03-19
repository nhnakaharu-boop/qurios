import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Qurios', template: '%s | Qurios' },
  description: '5分で解決。全国の講師とリアルタイムマッチングする学習SNS。脳科学が証明した授業設計。',
  keywords: ['学習', 'オンライン授業', '家庭教師', 'マッチング', '勉強', '受験'],
  openGraph: {
    title: 'Qurios — 5分で解決する学習革命',
    description: '困った課題を投稿するだけで全国の講師が5分で解説。',
    url: 'https://qurio.jp',
    siteName: 'Qurios',
    locale: 'ja_JP',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F8FA' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0C10' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning className={inter.variable}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                fontFamily: 'var(--font-inter), Hiragino Sans, Yu Gothic, system-ui, sans-serif',
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
