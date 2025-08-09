import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';

import './globals.css';

import { Sidebar } from '@/components/sidebar';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'FinalStore',
  description: 'A better and cleaner way to manage react states'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} dark antialiased`}>
        <div className="mx-auto max-w-[1124px] lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
          <Sidebar />
          <main className="px-3 py-4 lg:px-6 lg:py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
