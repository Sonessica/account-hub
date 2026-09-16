"use client";

/* eslint-disable @next/next/no-img-element -- remote avatars are user-managed */
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Grip, LockKeyhole, MoreHorizontal, Pin, Star } from "lucide-react";
import type { Account, AccountTag, Platform, Tag } from "@prisma/client";
import { reorderAccounts, toggleFavorite, updateAccountLayout } from "@/app/actions";
import { maskEmail, safeUrl } from "@/lib/utils";

export type BentoSize = "compact" | "standard" | "wide" | "large";
type BentoAccount = Account & { platform: Platform; tags: (AccountTag & { tag: Tag })[] };
const sizes: { key: BentoSize; label: string }[] = [{ key: "compact", label: "S" }, { key: "standard", label: "M" }, { key: "wide", label: "W" }, { key: "large", label: "L" }];

export function BentoDashboard({ initialAccounts }: { initialAccounts: BentoAccount[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [editing, setEditing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function resize(id: string, bentoSize: BentoSize) {
    setAccounts((items) => items.map((item) => item.id === id ? { ...item, bentoSize } : item));
    startTransition(() => void updateAccountLayout(id, { bentoSize }));
  }
  function pin(id: string, pinned: boolean) {
    setAccounts((items) => items.map((item) => item.id === id ? { ...item, pinned } : item).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.sortOrder - b.sortOrder));
    startTransition(() => void updateAccountLayout(id, { pinned }));
  }
  function drop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    setAccounts((items) => {
      const next = [...items];
      const from = next.findIndex((item) => item.id === draggedId);
      const to = next.findIndex((item) => item.id === targetId);
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      startTransition(() => void reorderAccounts(next.map((item) => item.id)));
      return next.map((item, sortOrder) => ({ ...item, sortOrder }));
    });
    setDraggedId(null);
  }

  return <>
    <div className="layout-bar"><span>{accounts.length} 个账号 · 自动紧凑排列</span><button className={editing ? "button active" : "button"} onClick={() => { setEditing(!editing); setMenuId(null); }}><Grip size={15}/>{editing ? "完成布局" : "编辑布局"}</button></div>
    <div className={`bento-canvas${editing ? " is-editing" : ""}`}>
      {accounts.map((account) => <BentoCard key={account.id} account={account} editing={editing} dragging={draggedId===account.id} menuOpen={menuId===account.id} onMenu={()=>setMenuId(menuId===account.id?null:account.id)} onDragStart={()=>setDraggedId(account.id)} onDrop={()=>drop(account.id)} onResize={(size)=>resize(account.id,size)} onPin={()=>pin(account.id,!account.pinned)}/>) }
    </div>
  </>;
}

function BentoCard({ account, editing, dragging, menuOpen, onMenu, onDragStart, onDrop, onResize, onPin }: { account: BentoAccount; editing: boolean; dragging: boolean; menuOpen: boolean; onMenu: () => void; onDragStart: () => void; onDrop: () => void; onResize: (size: BentoSize) => void; onPin: () => void }) {
  const size = (["compact","standard","wide","large"].includes(account.bentoSize) ? account.bentoSize : "standard") as BentoSize;
  const identifier = account.username ? `@${account.username.replace(/^@/, "")}` : maskEmail(account.email) || account.platformUserId || "未设置账号标识";
  const profile = safeUrl(account.profileUrl);
  const openUrl = profile || safeUrl(account.loginUrl ?? account.platform.defaultLoginUrl);
  const needsAttention = !account.username && !account.email && !account.platformUserId;
  const content = <><div className="bento-top"><span className="bento-logo">{account.platform.name.slice(0,1).toUpperCase()}</span><span className="bento-platform">{account.platform.name}</span>{account.pinned&&<Pin size={13} className="pin-indicator"/>}<button className="bento-more" onClick={(event)=>{event.preventDefault();onMenu();}} title="账号操作"><MoreHorizontal size={17}/></button></div><div className="bento-identity"><div className="bento-avatar">{account.avatarUrl?<img src={account.avatarUrl} alt="" referrerPolicy="no-referrer"/>:account.displayName.slice(0,1).toUpperCase()}</div><div><h2>{account.displayName}</h2><p className="bento-display">{account.username||account.email||account.platformUserId||account.platform.name}</p><p className="bento-identifier">{identifier}</p></div></div><div className="bento-status"><span className={needsAttention?"attention":"healthy"}>{needsAttention?"! 需完善":<><Check size={12}/>正常</>}</span>{account.vaultItemHint&&<span className="healthy"><LockKeyhole size={11}/>Vault</span>}{size==="large"&&<span className="neutral">手工维护</span>}</div>{size==="large"&&<div className="bento-services"><span>Profile</span><span>Login</span><span>Vaultwarden</span></div>}<div className="bento-bottom"><span>{account.tags.slice(0,2).map(({tag})=>tag.name).join(" · ")||"数字身份"}</span>{openUrl&&<a href={openUrl} target="_blank" rel="noreferrer" onClick={(event)=>event.stopPropagation()} title="打开平台"><ArrowUpRight size={16}/></a>}</div></>;
  return <article className={`bento-card size-${size}${dragging?" dragging":""}`} style={{"--accent":account.platform.color} as React.CSSProperties} draggable={editing} onDragStart={onDragStart} onDragOver={(event)=>editing&&event.preventDefault()} onDrop={onDrop}>
    {editing?<div className="layout-editor"><span className="drag-handle"><Grip size={15}/>拖动</span><div>{sizes.map(({key,label})=><button key={key} className={size===key?"active":""} onClick={()=>onResize(key)} title={key}>{label}</button>)}</div><button className={account.pinned?"active":""} onClick={onPin} title="置顶"><Pin size={13}/></button></div>:null}
    {editing?<div className="bento-content">{content}</div>:<Link href={`/accounts/${account.id}`} className="bento-content">{content}</Link>}
    {menuOpen&&!editing&&<div className="card-menu"><Link href={`/accounts/${account.id}/edit`}>编辑账号</Link><button onClick={onPin}>{account.pinned?"取消置顶":"置顶账号"}</button><form action={toggleFavorite.bind(null,account.id)}><button><Star size={13}/>{account.favorite?"取消收藏":"收藏"}</button></form><div className="menu-sizes">{sizes.map(({key,label})=><button key={key} className={size===key?"active":""} onClick={()=>onResize(key)}>{label}</button>)}</div></div>}
  </article>;
}
