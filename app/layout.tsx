import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "房务通 · 出租屋信息导航",
  description:
    "集中管理房源、租客、合同、账务、维修与常用工具的出租屋信息导航中心。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
