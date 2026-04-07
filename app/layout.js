import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutWrapper } from '@/components/LayoutWrapper';

const inter = Inter({ subsets: ['latin'] });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'no',
};

export const metadata = {
  title: 'Cattle Feed Distribution',
  description: 'Customer portal for cattle feed distribution business',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Prevent double-tap-to-zoom (non-blocking check only)
                var lastTouchEnd = 0;
                document.addEventListener('touchend', function(e) {
                  var now = Date.now();
                  if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                  }
                  lastTouchEnd = now;
                }, { passive: false });

                // Prevent pinch-zoom
                document.addEventListener('gesturestart', function(e) {
                  e.preventDefault();
                });

                document.addEventListener('gesturechange', function(e) {
                  e.preventDefault();
                });

                document.addEventListener('gestureend', function(e) {
                  e.preventDefault();
                });
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
