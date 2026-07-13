import type { Metadata } from "next";
import "./globals.css";
import "./p0.css";
export const metadata: Metadata = { title: "竞见｜竞品外宣情报工作台", description: "收集、分析留学行业竞品外宣，并生成月度报告与展示 PPT。" };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
