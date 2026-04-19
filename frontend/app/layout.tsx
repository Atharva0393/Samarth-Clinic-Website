import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Samarth Dental Clinic — Management System',
  description: 'Complete clinic management software for Samarth Multispeciality Dental Clinic, Aurangabad.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-clinic-bg antialiased`}>
        {children}
      </body>
    </html>
  );
}
