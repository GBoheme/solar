import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام تدقيق وإدارة معاملات النقل اللوجستي",
  description: "نظام ضبط جودة لمعاملات النقل الحكومي واللوجستيات النفطية — يمنع الخطأ قبل إصدار الكتاب الرسمي",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        {/* تفعيل الوضع الليلي قبل الرسم لمنع الوميض */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.theme==='dark'||(!('theme' in localStorage)&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
