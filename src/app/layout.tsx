import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans, Noto_Sans_Tamil } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { NewspaperFilterProvider } from '@/components/layout/NewspaperFilterPills';
import RealtimeToastListener from '@/components/layout/RealtimeToastListener';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  variable: '--font-tamil',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#5B21B6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Hindu — Subscription & Circulation Portal',
  description: 'Enterprise circulation and subscription management for Dinakaran, Dinamalar, NIE / DIN, and The Hindu in Royapuram, Chennai-13.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Hindu — Subscription Portal',
    description: 'Enterprise multi-newspaper circulation and subscription management.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${plusJakartaSans.variable} ${notoSansTamil.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          <NewspaperFilterProvider>
            {children}
            <RealtimeToastListener />
          </NewspaperFilterProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
