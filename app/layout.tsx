import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'DHANVARSHA MATKA LIVE | Fastest Verified Results',
  description: 'High-frequency daily result dashboard and financial ticker interface for Dhanvarsha Matka.',
  openGraph: {
    title: 'DHANVARSHA MATKA LIVE',
    description: 'High-frequency daily result dashboard and financial ticker interface for Dhanvarsha.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DHANVARSHA MATKA LIVE',
    description: 'High-frequency daily result dashboard and financial ticker interface for Dhanvarsha.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body suppressHydrationWarning className="font-sans bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
