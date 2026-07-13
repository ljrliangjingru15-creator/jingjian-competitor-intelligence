"use client";
import {usePathname} from "next/navigation";
import Link from "next/link";
import type {ReactNode} from "react";

const nav=[
  ["/","总览"],["/materials","素材库"],["/review","审核箱"],["/monitoring","监测任务"],["/competitors","竞品档案"],["/analysis","分析中心"],["/reports","报告中心"],["/imports","导入导出"],["/settings","系统设置"],
];
export default function AppShell({children,title,description,actions}:{children:ReactNode;title?:string;description?:string;actions?:ReactNode}){
  const path=usePathname();return <main className="app-shell"><header className="app-header"><Link className="brand" href="/"><span className="mark">见</span><div>竞见<small>竞品外宣情报工作台</small></div></Link><nav>{nav.map(([href,label])=><Link key={href} className={path===href?"active":""} href={href}>{label}</Link>)}</nav><Link className="header-help" href="/settings">数据状态</Link></header>{title&&<section className="page-heading"><div><span className="eyebrow">COMPETITOR INTELLIGENCE</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="heading-actions">{actions}</div>}</section>}<div className="app-content">{children}</div></main>
}
