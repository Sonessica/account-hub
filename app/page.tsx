import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { BentoDashboard } from "@/components/bento-dashboard";

type SearchParams = { q?: string; filter?: string };
const hasIdentity = (account: { username: string | null; email: string | null; platformUserId: string | null }) => Boolean(account.username || account.email || account.platformUserId);

export default async function Dashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const { q = "", filter = "all" } = await searchParams;
  const fields = ["displayName", "username", "platformUserId", "email", "phone", "notes"] as const;
  const found = await db.account.findMany({
    where: q ? { OR: [...fields.map((key)=>({[key]:{contains:q,mode:"insensitive" as const}})),{platform:{name:{contains:q,mode:"insensitive" as const}}},{tags:{some:{tag:{name:{contains:q,mode:"insensitive" as const}}}}}] } : undefined,
    include: { platform: true, tags: { include: { tag: true } } },
    orderBy: [{ pinned: "desc" }, { sortOrder: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
  });
  const [total,platforms] = await Promise.all([db.account.count(),db.platform.findMany({orderBy:{name:"asc"}})]);
  const favoriteCount = await db.account.count({where:{favorite:true}});
  const attentionCount = await db.account.count({where:{username:null,email:null,platformUserId:null}});
  const accounts = found.filter((account)=>filter==="favorite"?account.favorite:filter==="attention"?!hasIdentity(account):filter==="healthy"?hasIdentity(account):true);
  const href = (nextFilter:string) => { const p=new URLSearchParams();if(q)p.set("q",q);if(nextFilter!=="all")p.set("filter",nextFilter);return p.size?`/?${p}`:"/"; };
  return <><Header/><main className="shell dashboard bento-dashboard">
    <section className="dashboard-title"><div><p className="eyebrow">PERSONAL IDENTITY DESKTOP</p><h1>Accounts</h1><p>属于你的数字身份桌面</p></div><div className="account-total"><strong>{total}</strong><span>Accounts</span></div></section>
    <section className="bento-toolbar"><form className="search"><Search size={18}/><input name="q" defaultValue={q} placeholder="搜索账号、平台、昵称、邮箱、UID…"/><input type="hidden" name="filter" value={filter}/></form></section>
    <nav className="filter-tabs bento-filters">{[["all",`全部 ${total}`],["healthy",`正常 ${Math.max(0,total-attentionCount)}`],["attention",`需完善 ${attentionCount}`],["favorite",`收藏 ${favoriteCount}`]].map(([key,label])=><Link href={href(key)} className={filter===key?"active":""} key={key}>{label}</Link>)}</nav>
    {accounts.length?<BentoDashboard initialAccounts={accounts} platforms={platforms}/>:<div className="empty"><div>＋</div><h2>{q?"没有找到匹配账号":"还没有符合条件的账号"}</h2><p>搜索或筛选结果会自动重新组成紧凑 Bento。</p></div>}
  </main></>;
}
