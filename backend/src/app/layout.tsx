import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const outfit = localFont({ src: './fonts/outfit.ttf', variable: '--font-outfit', display: 'swap', weight: '100 900' });

export const metadata: Metadata = {
  title: 'Recon',
  description: 'Watches the Valorant daily store of your Riot accounts and alerts you when a wishlist skin shows up.',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#101010', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>{children}</body>
    </html>
  );
}
