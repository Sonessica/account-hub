import Link from "next/link";
import { Grid2X2, Layers3, Plus, Search, SlidersHorizontal } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Header } from "@/components/header";
import { AccountCard } from "@/components/account-card";
import { PlatformSection } from "@/components/platform-section";

type SearchParams = { q?: string; filter?: string; view?: string; density?: string };
const hasIdentity = (account: { username: string | null; email: string | null; platformUserId: string | null }) => Boolean(account.username || account.email || account.platformUserId);

export default async function Dashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireUser();
  const { q = "", filter = "all", view = "grouped", density = "default" } = await searchParams;
  const searchFields = ["displayName", "username", "platformUserId", "email", "phone", "notes"] as const;
  const allAccounts = await db.account.findMany({
    where: q ? { OR: [
      ...searchFields.map((key) => ({ [key]: { contains: q, mode: "insensitive" as const } })),
      { platform: { name: { contains: q, mode: "insensitive" as const } } },
      { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } },
    ] } : undefined,
    include: { platform: true, tags: { include: { tag: true } } },
    orderBy: [{ favorite: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  const total = await db.account.count();
  const favoriteCount = await db.account.count({ where: { favorite: true } });
  const attentionCount = await db.account.count({ where: { username: null, email: null, platformUserId: null } });
  const filtered = allAccounts.filter((account) => filter === "favorite" ? account.favorite : filter === "attention" ? !hasIdentity(account) : filter === "healthy" ? hasIdentity(account) : true);
  const forceFlat = Boolean(q) || filter !== "all" || view === "all";
  const grouped = Map.groupBy(filtered, (account) => account.platformId);
  const platforms = [...grouped.values()].sort((a, b) => b.length - a.length || a[0].platform.name.localeCompare(b[0].platform.name));
  const query = (changes: Partial<SearchParams>) => {
    const params = new URLSearchParams({ ...(q && { q }), ...(filter !== "all" && { filter }), ...(view !== "grouped" && { view }), ...(density !== "default" && { density }), ...changes });
    for (const [key, value] of [...params]) {
      if (!value || (key === "filter" && value === "all") || (key === "view" && value === "grouped") || (key === "density" && value === "default")) params.delete(key);
    }
    const value = params.toString();
    return value ? `/?${value}` : "/";
  };

  return <><Header/><main className={`shell dashboard density-${density}`}>
    <section className="dashboard-title"><div><p className="eyebrow">ACCOUNT DASHBOARD</p><h1>我的账号</h1><p>统一管理你的数字身份与访问入口</p></div><div className="account-total"><strong>{total}</strong><span>个账号</span></div></section>
    <section className="dashboard-controls">
      <div className="filter-tabs">{[["all",`全部 ${total}`],["healthy",`正常 ${Math.max(0,total-attentionCount)}`],["attention",`需完善 ${attentionCount}`],["favorite",`收藏 ${favoriteCount}`]].map(([key,label])=><Link key={key} className={filter===key?"active":""} href={query({filter:key})}>{label}</Link>)}</div>
      <div className="view-switch"><Link className={!forceFlat&&view==="grouped"?"active":""} href={query({view:"grouped",filter:"all"})}><Layers3 size={15}/>按平台</Link><Link className={view==="all"?"active":""} href={query({view:"all"})}><Grid2X2 size={15}/>全部账号</Link></div>
    </section>
    <section className="search-row"><form className="search"><Search size={18}/><input name="q" defaultValue={q} placeholder="搜索账号、平台、昵称、邮箱、UID…"/><input type="hidden" name="filter" value={filter}/><input type="hidden" name="view" value={view}/></form><div className="density-switch" title="卡片密度"><SlidersHorizontal size={15}/>{[["comfortable","宽松"],["default","默认"],["compact","紧凑"]].map(([key,label])=><Link className={density===key?"active":""} href={query({density:key})} key={key}>{label}</Link>)}</div><Link href="/accounts/new" className="button primary add-account"><Plus size={16}/>添加账号</Link></section>
    {filtered.length ? forceFlat ? <section><div className="result-heading"><h2>{q?"搜索结果":filter==="favorite"?"收藏账号":filter==="attention"?"需要完善":"全部账号"}</h2><span>{filtered.length}</span></div><div className="account-grid all-grid">{filtered.map(account=><AccountCard account={account} key={account.id}/>)}</div></section> : <div className="platform-groups">{platforms.map(accounts=><PlatformSection key={accounts[0].platformId} platformKey={accounts[0].platform.key} name={accounts[0].platform.name} color={accounts[0].platform.color} count={accounts.length}>{accounts.map(account=><AccountCard account={account} key={account.id}/>)}</PlatformSection>)}</div> : <div className="empty"><div>＋</div><h2>{q?"没有找到匹配账号":"还没有符合条件的账号"}</h2><p>{q?"尝试更换关键词或清除筛选。":"添加一个账号，开始整理你的数字身份。"}</p><Link href="/accounts/new" className="button primary">添加账号</Link></div>}
  </main></>;
}
