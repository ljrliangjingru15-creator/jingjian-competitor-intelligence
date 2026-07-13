"use client";
import {usePathname} from "next/navigation";
import Link from "next/link";
import type {ReactNode} from "react";

const nav=[
  ["/","总览"],["/materials","素材库"],["/review","审核箱"],["/monitoring","监测任务"],["/competitors","竞品档案"],["/analysis","分析中心"],["/reports","报告中心"],["/imports","导入导出"],["/settings","系统设置"],
];
export default function AppShell({children,title,description,actions}:{children:ReactNode;title?:string;description?:string;actions?:ReactNode}){
  const path=usePathname();return <main className="app-shell"><header className="app-header"><Link className="brand" href="/"><span className="mark">见</span><div className="brand-copy">竞见<small>COMPETITOR INTELLIGENCE</small></div></Link><nav aria-label="工作台主导航">{nav.map(([href,label])=><Link key={href} className={path===href?"active":""} href={href}><span>{label}</span></Link>)}</nav><Link className="header-help" href="/settings"><span className="status-dot"/>数据在线</Link></header>{title&&<section className="page-heading"><div><span className="eyebrow">COMPETITOR INTELLIGENCE</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="heading-actions">{actions}</div>}</section>}<div className="app-content">{children}</div></main>
}
