import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const amiri = localFont({
  src: [
    {
      path: "../../public/fonts/Amiri-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Amiri-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "صانع الخطط القرآنية",
  description: "أداة لتوليد خطط الحفظ والمراجعة القرآنية للطلاب",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${amiri.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
