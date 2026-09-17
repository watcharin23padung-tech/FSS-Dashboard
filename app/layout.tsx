import type { Metadata } from "next";
import { Kanit, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-kanit",
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dashboard | คณะวิทยาศาสตร์การกีฬา มหาวิทยาลัยบูรพา",
  description: "ระบบภาพรวมผลการดำเนินงานของฝ่ายต่าง ๆ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${kanit.variable} ${plexThai.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
