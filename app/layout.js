import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LayoutWrapper } from '@/components/LayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Cattle Feed Distribution',
  description: 'Customer portal for cattle feed distribution business',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
