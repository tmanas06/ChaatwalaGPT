import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChaatwalaGPT — Indian Street Food Guide',
  description:
    'Meet Chaatwaala — your passionate, knowledgeable guide to Indian street food. Ask about recipes, regional specialties, spice blends, history, and the best places to eat across India.',
  keywords: [
    'Indian street food',
    'chaat',
    'pani puri',
    'vada pav',
    'chatbot',
    'recipes',
    'food guide',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
