import type { Metadata } from 'next';
import { Bricolage_Grotesque, Manrope } from 'next/font/google';

import { ToastViewport } from '@/components/ui';

import './globals.css';

const bricolageGrotesque = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Viuê | Entretenimento em comunidade',
  description: 'Registre, avalie e compartilhe filmes, séries, games e livros na Viuê.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolageGrotesque.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
        <ToastViewport />
      </body>
    </html>
  );
}
