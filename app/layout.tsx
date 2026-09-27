import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/Toast';

export const metadata: Metadata = {
  title: 'نظام إدارة التخليص الجمركي | مكتب التخليص الجمركي المصري',
  description: 'نظام محاسبي وإداري متكامل للتخليص الجمركي، إدارة الشحنات، العملاء، الودائع والخزينة مع تدقيق العمليات بالكامل.',
  openGraph: {
    title: 'نظام إدارة التخليص الجمركي - Customs Clearance Management System',
    description: 'نظام محاسبي وإداري متكامل لمكاتب التخليص الجمركي في مصر',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'نظام إدارة التخليص الجمركي',
    description: 'نظام محاسبي وإداري متكامل لمكاتب التخليص الجمركي في مصر',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="h-full bg-slate-50 antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var _f = window.fetch;
                  var _bound = _f ? _f.bind(window) : _f;
                  Object.defineProperty(window, 'fetch', {
                    configurable: true,
                    enumerable: true,
                    get: function() { return _bound; },
                    set: function(v) { _bound = v; }
                  });
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="h-full font-sans text-slate-800" suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
