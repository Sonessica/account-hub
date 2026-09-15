import Link from "next/link";
import {Download} from "lucide-react";
import {requireUser} from "@/lib/auth";
import {db} from "@/lib/db";
import {Header} from "@/components/header";
export default async function Settings(){await requireUser();const logs=await db.auditLog.findMany({take:20,orderBy:{createdAt:"desc"}});return <><Header/><main className="shell narrow"><div className="page-title"><div><Link href="/">← 返回</Link><h1>设置</h1><p>Account Hub V1.0.0 · Manual Account Center</p></div></div><section className="settings-card"><h2>数据导出</h2><p>导出平台、账号、标签和备注。导出文件不包含密码，因为系统从不保存密码。</p><a className="button primary" href="/api/export"><Download size={16}/>导出 JSON</a></section><section className="settings-card"><h2>最近活动</h2><div className="audit-list">{logs.map(log=><div key={log.id}><span>{log.action.replaceAll("_"," ")}</span><small>{log.createdAt.toLocaleString("zh-CN")}</small></div>)}</div></section></main></>}
