"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { id: number; org: string; title: string; platform: string; date: string; tag: string; status: string; tone: string };

const seed: Item[] = [
  { id: 1, org: "启德教育", title: "2026 全球留学趋势白皮书发布", platform: "微信公众号", date: "07月10日", tag: "行业报告", status: "已分析", tone: "blue" },
  { id: 2, org: "美世教育", title: "新加坡名校申请私享会", platform: "小红书", date: "07月09日", tag: "线下活动", status: "已分析", tone: "purple" },
  { id: 3, org: "新东方前途出国", title: "高考后升学，还有哪些路径？", platform: "视频号", date: "07月08日", tag: "路径规划", status: "待分析", tone: "orange" },
  { id: 4, org: "新航道", title: "雅思课程服务体系 3.0 升级", platform: "官网", date: "07月06日", tag: "产品升级", status: "已分析", tone: "green" },
];

export default function Home() {
  const [items, setItems] = useState(seed);
  const [org, setOrg] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState("全部素材");
  const [modal, setModal] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportFiles, setReportFiles] = useState<Array<{name:string;url:string}>>([]);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorNotice, setMonitorNotice] = useState("");
  const [monitorName, setMonitorName] = useState("启德教育");
  const [keywords, setKeywords] = useState("留学报告、广州活动、产品升级");
  const [sources, setSources] = useState(["官网与新闻", "高校合作公告", "公开活动页"]);

  const visible = useMemo(() => items.filter(i => tab === "全部素材" || (tab === "已分析" ? i.status === "已分析" : i.status === "待分析")), [items, tab]);
  async function loadMaterials(){const d=await fetch("/api/materials",{cache:"no-store"}).then(r=>r.json()).catch(()=>null);if(d?.materials)setItems(d.materials.map((m:any)=>({id:m.id,org:m.competitors?.name||"未知机构",title:m.title,platform:m.platform||"待识别",date:new Date(m.created_at).toLocaleDateString("zh-CN"),tag:m.tag||"待分类",status:m.status||"待分析",tone:"blue"})))}
  useEffect(()=>{loadMaterials()},[]);

  async function submit(analyze: boolean) {
    if (!org.trim() || (!url.trim() && files.length === 0)) { setNotice("请填写机构名称，并添加链接或截图"); return; }
    const platform = url.includes("xiaohongshu") ? "小红书" : url.includes("weixin") ? "微信公众号" : "待识别";
    setNotice("正在写入资料库…");
    const response=await fetch("/api/materials", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ organization:org, title:note || "新收集的外宣内容", sourceUrl:url, platform, status:"待分析", note, sourceType:"manual" }) }).catch(()=>null);
    const saved=await response?.json().catch(()=>null);
    if(!response?.ok||!saved?.material?.id){setNotice(`写入失败：${saved?.error||"无法连接数据库，请检查Vercel环境变量"}`);return;}
    setItems(v => [{ id: Date.now(), org, title: note || "新收集的外宣内容", platform, date: "今天", tag: "待分类", status: analyze ? "已分析" : "待分析", tone: "blue" }, ...v]);
    for(const file of files){const form=new FormData();form.append("file",file);form.append("materialId",String(saved.material.id));const upload=await fetch("/api/uploads",{method:"POST",body:form});if(!upload.ok){const e=await upload.json().catch(()=>null);setNotice(`素材已入库，但附件上传失败：${e?.error||"未知错误"}`);return;}}
    let analysisMode="";if(analyze){const analysis=await fetch("/api/analyze",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({materialId:saved.material.id,organization:org,title:note||"新收集的外宣内容",sourceUrl:url,note})});const result=await analysis.json().catch(()=>null);if(!analysis.ok){setNotice(`素材已入库，但分析失败：${result?.error?.message||result?.error||"未知错误"}`);return;}analysisMode=result?.mode;}
    setNotice(analyze ? analysisMode==="basic"?"已归档；OpenAI额度不足，已完成免费基础分析":"已归档并完成AI分析" : "已加入 2026 年 7 月竞品库");
    setOrg(""); setUrl(""); setNote(""); setFiles([]);
    await loadMaterials();
  }

  return <main>
    <header className="topbar">
      <div className="brand"><span className="mark">见</span><div>竞见 <small>竞品外宣情报工作台</small></div></div>
      <nav><a className="active" href="#collect">工作台</a><a href="#monitor">自动监测</a><a href="/review">审核箱</a><a href="/competitors">竞品洞察</a><a href="#reports">报告中心</a></nav>
      <div className="month">2026 年 7 月⌄</div><button className="avatar">JR</button>
    </header>

    <section className="hero" id="collect">
      <div className="eyebrow">COMPETITIVE INTELLIGENCE</div>
      <h1>把你看到的每一条外宣，<br/><em>变成可行动的市场洞察。</em></h1>
      <p>只需标注机构、粘贴链接或上传截图。系统将自动识别内容、提炼策略，沉淀进月度竞品库。</p>
      <div className="stats"><span><b>{items.length + 20}</b> 本月收录</span><span><b>{items.filter(i=>i.status === "已分析").length + 15}</b> 已完成分析</span><span><b>8</b> 监测机构</span></div>
    </section>

    <section className="workspace">
      <div className="collector card">
        <div className="section-title"><div><span className="step">01</span><h2>投递一条外宣素材</h2></div><span className="hint">只需 3 项，其余交给我们</span></div>
        <div className="form-grid">
          <label><span>机构名称 <i>*</i></span><input value={org} onChange={e=>setOrg(e.target.value)} placeholder="例如：启德教育 / 美世教育"/></label>
          <label><span>内容链接</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="粘贴小红书、公众号、视频号等链接"/></label>
        </div>
        <label><span>截图或素材</span><div className="drop"><input aria-label="上传截图" type="file" multiple accept="image/*,.pdf" onChange={e=>setFiles(Array.from(e.target.files || []))}/><b>＋</b><strong>{files.length ? `已选择 ${files.length} 个文件` : "拖拽或点击上传截图"}</strong><small>{files.length ? files.map(f=>f.name).join("、") : "支持 JPG、PNG、PDF，单个文件不超过 20MB"}</small></div></label>
        <label><span>想重点关注什么？ <small>选填</small></span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="例如：重点看它如何包装长线规划产品，以及结尾如何引导咨询…"/></label>
        {notice && <div className="notice">✓ {notice}</div>}
        <div className="actions"><button className="ghost" onClick={()=>submit(false)}>仅加入本月竞品库</button><button className="primary" onClick={()=>submit(true)}>✦ 归档并立即分析</button></div>
      </div>

      <aside className="flow card"><div className="section-title"><div><span className="step">02</span><h2>我们会自动完成</h2></div></div>
        <ol>
          <li><span>01</span><div><b>识别与归档</b><p>平台、账号、时间、标题、内容形式</p></div></li>
          <li><span>02</span><div><b>内容结构化</b><p>主题、客群、产品、卖点、CTA</p></div></li>
          <li><span>03</span><div><b>策略分析</b><p>营销目的、转化路径、产品意图</p></div></li>
          <li><span>04</span><div><b>形成行动建议</b><p>可借鉴、差异化、待验证、勿跟进</p></div></li>
        </ol>
        <div className="tip"><b>分析原则</b><p>事实、推断和待验证信息会分别标注，并显示判断置信度。</p></div>
      </aside>
    </section>

    <section className="monitor" id="monitor">
      <div className="monitor-heading"><div><span className="eyebrow">PUBLIC WEB MONITORING</span><h2>让公开网络，成为你的第二个情报入口。</h2><p>自动扫描官网、公开新闻、活动页与高校合作公告；社交平台仍以人工链接和截图补充，保证证据可靠。</p></div><div className="monitor-health"><span className="pulse"></span><div><b>监测服务运行中</b><small>上次扫描：今天 09:30</small></div></div></div>
      <div className="monitor-grid">
        <div className="monitor-config card">
          <div className="section-title"><div><span className="step">A</span><h2>新增监测任务</h2></div><span className="hint">公开来源优先</span></div>
          <div className="form-grid"><label><span>竞品名称</span><input value={monitorName} onChange={e=>setMonitorName(e.target.value)}/></label><label><span>监测地区</span><select><option>全国 + 广州及大湾区</option><option>仅广州及大湾区</option><option>全国</option></select></label></div>
          <label><span>关注关键词</span><input value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="用顿号分隔"/></label>
          <label><span>公开信息源</span><div className="source-pills">{["官网与新闻","高校合作公告","公开活动页","招聘与组织变化"].map(s=><button type="button" key={s} className={sources.includes(s)?"selected":""} onClick={()=>setSources(v=>v.includes(s)?v.filter(x=>x!==s):[...v,s])}>{sources.includes(s)?"✓ ":"＋ "}{s}</button>)}</div></label>
          <div className="form-grid"><label><span>扫描频率</span><select><option>每周一、周四</option><option>每天</option><option>每周一次</option></select></label><label><span>发现后处理</span><select><option>先进入审核箱</option><option>自动分析并归档</option></select></label></div>
          {monitorNotice && <div className="notice">✓ {monitorNotice}</div>}
          <div className="actions"><button className="ghost">保存为草稿</button><button className="primary" onClick={async()=>{setMonitoring(true);setMonitorNotice("");await fetch("/api/monitors",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({organization:monitorName,keywords,sources,region:"全国 + 广州及大湾区",frequency:"每周一、周四",reviewMode:"先进入审核箱"})}).catch(()=>null);setMonitoring(false);setMonitorNotice(`“${monitorName}”监测任务已启用`);}}>{monitoring?"正在建立监测…":"启用自动监测"}</button></div>
        </div>
        <aside className="monitor-summary card">
          <div className="section-title"><div><span className="step">B</span><h2>本周自动发现</h2></div><a className="text-btn" href="/review">查看审核箱 →</a></div>
          <div className="discovery-count"><b>12</b><span>条新线索<br/><small>来自 6 家机构</small></span></div>
          <div className="discoveries"><article><span className="source-dot official">官网</span><div><a href="https://www.eic.org.cn/" target="_blank" rel="noreferrer"><b>启德发布《2026全球留学趋势报告》 ↗</b></a><p>2 小时前 · 与“留学报告”高度相关</p></div><button onClick={()=>setItems(v=>[{id:Date.now(),org:"启德教育",title:"2026全球留学趋势报告",platform:"官网",date:"今天",tag:"自动发现",status:"待分析",tone:"blue"},...v])}>＋ 入库</button></article><article><span className="source-dot school">高校</span><div><a href="https://www.xhd.cn/" target="_blank" rel="noreferrer"><b>新航道与海外院校新增合作项目 ↗</b></a><p>昨天 · 来源可信度 A</p></div><a className="review-link" href="/review?item=2">审核</a></article><article><span className="source-dot event">活动</span><div><a href="https://www.mcedu.com/" target="_blank" rel="noreferrer"><b>美世广州站私享会开始报名 ↗</b></a><p>昨天 · 疑似高净值家庭活动</p></div><a className="review-link" href="/review?item=3">审核</a></article></div>
          <div className="monitor-rule"><b>自动过滤</b><span>已排除 18 条重复或低相关内容</span></div>
        </aside>
      </div>
      <div className="active-monitors"><div className="active-head"><div><span className="step">C</span><h2>正在运行的任务</h2></div><span>8 家竞品 · 4 类公开来源</span></div><div className="monitor-cards">{[["新东方前途出国","6 个关键词","今天 09:30","3 条新发现"],["启德教育","5 个关键词","今天 09:31","4 条新发现"],["美世教育","4 个关键词","今天 09:33","2 条新发现"],["新航道","5 个关键词","今天 09:35","3 条新发现"]].map((m,i)=><article key={m[0]}><div className={`org ${["orange","blue","purple","green"][i]}`}>{m[0][0]}</div><div><b>{m[0]}</b><p>{m[1]} · 最近扫描 {m[2]}</p></div><span>{m[3]}</span><button>•••</button></article>)}</div></div>
    </section>

    <section className="library" id="library">
      <div className="library-head"><div><span className="step">03</span><h2>本月素材库</h2><p>2026 年 7 月 · 已收录 {items.length + 20} 条竞品外宣</p></div><button className="outline">筛选</button></div>
      <div className="tabs">{["全部素材","已分析","待分析"].map(t=><button onClick={()=>setTab(t)} className={tab===t?"on":""} key={t}>{t}</button>)}</div>
      <div className="table-wrap"><table><thead><tr><th>机构 / 内容</th><th>平台</th><th>发布时间</th><th>内容标签</th><th>状态</th><th></th></tr></thead><tbody>{visible.map(i=><tr key={i.id}><td><div className={`org ${i.tone}`}>{i.org.slice(0,1)}</div><div><b>{i.org}</b><p>{i.title}</p></div></td><td>{i.platform}</td><td>{i.date}</td><td><span className="tag">{i.tag}</span></td><td><span className={i.status === "已分析" ? "done":"pending"}>● {i.status}</span></td><td><button className="more" onClick={()=>setModal(true)}>•••</button></td></tr>)}</tbody></table></div>
    </section>

    <section className="insight" id="insight"><div><span className="eyebrow">THIS MONTH’S SIGNAL</span><h2>本月信号：<br/>留学外宣正从“结果炫耀”<br/>转向“<em>过程确定性</em>”。</h2><p>8 家重点机构中，6 家在近期内容中加强了服务流程、顾问配置或申请进度透明化表达。</p></div><div className="signal"><div><span>服务透明化</span><b>↑ 34%</b></div><div><span>路径规划内容</span><b>↑ 21%</b></div><div><span>单纯录取捷报</span><b className="down">↓ 12%</b></div></div></section>

    <section className="report card" id="reports"><div><span className="step">04</span><h2>生成本月竞品报告</h2><p>基于已归档素材，输出管理层摘要、完整报告、展示 PPT 与下月行动清单。</p></div><div className="report-actions"><span>{reportFiles.length?reportFiles.map(f=><a key={f.url} href={f.url}>{f.name}　</a>):"建议先完成全部待分析素材"}</span><button className="primary" onClick={async()=>{setReporting(true);const d=await fetch("/api/reports/generate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({period:"2026年7月"})}).then(r=>r.json()).catch(()=>null);setReportFiles(d?.files||[]);setReporting(false)}}>{reporting ? "正在生成 DOCX 与 PPTX…" : "生成 7 月报告与 PPT →"}</button></div></section>

    <footer>竞见 · 让每一条市场信号，都成为下一步行动的依据。<span>数据口径说明　 隐私与合规</span></footer>

    {modal && <div className="overlay" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setModal(false)}>×</button><span className="eyebrow">SINGLE CONTENT ANALYSIS</span><h2>这条内容在做什么？</h2><div className="analysis-grid"><article><small>动作判断</small><b>用权威报告建立专业认知</b><p>通过趋势数据降低用户决策门槛，并为后续咨询提供合理入口。</p></article><article><small>目标人群</small><b>处于早期规划阶段的家长</b><p>尚未确定国家与路径、对政策变化敏感的家庭。</p></article><article><small>转化路径</small><b>报告解读 → 资料领取 → 顾问评估</b><p>以低门槛知识产品承接私域线索。</p></article><article><small>对我方启示</small><b>把“信息”包装成诊断型产品</b><p>输出判断框架，而不只是罗列政策与院校信息。</p></article></div><div className="confidence">判断置信度 <strong>中高</strong>　·　产品意图仍需结合落地页验证</div></div></div>}
  </main>;
}
