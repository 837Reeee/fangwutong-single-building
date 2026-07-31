import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "房务通 · 单栋出租楼管理",
  description:
    "面向单栋出租楼的房间、水电和租金收据管理工具。",
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
