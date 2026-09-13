import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "笔记卫士 · 发布前风险检测",
  description: "面向小红书与抖音的 AI 发布前内容风险检测",
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
