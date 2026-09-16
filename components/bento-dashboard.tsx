"use client";

/* eslint-disable @next/next/no-img-element -- remote avatars are user-managed */
import { useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Grip, Link2, LockKeyhole, MoreHorizontal, Move, Pin, Star } from "lucide-react";
import type { Account, AccountTag, Platform, Tag } from "@prisma/client";
import { reorderAccounts, toggleFavorite, updateAccountLayout } from "@/app/actions";
import { maskEmail, safeUrl } from "@/lib/utils";
import { BentoAddFlow } from "@/components/bento-add-flow";

export type BentoSize = "compact" | "standard" | "wide" | "large";
type BentoAccount = Account & { platform: Platform; tags: (AccountTag & { tag: Tag })[] };
const sizes: { key: BentoSize; label: string; title: string }[] = [
  { key: "compact", label: "S", title: "小方块" }, { key: "standard", label: "M", title: "标准" },
  { key: "wide", label: "W", title: "横向" }, { key: "large", label: "L", title: "大卡片" },
];

export function BentoDashboard({ initialAccounts, platforms }: { initialAccounts: BentoAccount[]; platforms: Platform[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [editing, setEditing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [settledId, setSettledId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const refs = useRef(new Map<string, HTMLElement>());
  const [, startTransition] = useTransition();

  function animateLayout(update: () => void) {
    const before = new Map([...refs.current].map(([id, el]) => [id, el.getBoundingClientRect()]));
    flushSync(update);
    requestAnimationFrame(() => refs.current.forEach((el, id) => {
      const first = before.get(id); if (!first) return;
      const last = el.getBoundingClientRect(), dx = first.left-last.left, dy = first.top-last.top;
      const sx = first.width/last.width, sy = first.height/last.height;
      if(Math.abs(dx)+Math.abs(dy)+Math.abs(1-sx)+Math.abs(1-sy)>.02) el.animate([
        {transform:`translate(${dx}px,${dy}px) scale(${sx},${sy})`,transformOrigin:"top left"},
        {transform:"translate(0,0) scale(1)",transformOrigin:"top left"}
      ],{duration:520,easing:"cubic-bezier(.2,.88,.22,1.08)"});
    }));
  }
  function resize(id: string, bentoSize: BentoSize) {
    animateLayout(()=>setAccounts(items=>items.map(item=>item.id===id?{...item,bentoSize}:item)));
    setSettledId(id); window.setTimeout(()=>setSettledId(null),560);
    startTransition(()=>void updateAccountLayout(id,{bentoSize}));
  }
  function pin(id: string, pinned: boolean) {
    animateLayout(()=>setAccounts(items=>items.map(item=>item.id===id?{...item,pinned}:item).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||a.sortOrder-b.sortOrder)));
    startTransition(()=>void updateAccountLayout(id,{pinned}));
  }
  function moveOver(targetId: string) {
    if(!draggedId||draggedId===targetId)return;
    animateLayout(()=>setAccounts(items=>{const next=[...items],from=next.findIndex(i=>i.id===draggedId),to=next.findIndex(i=>i.id===targetId);const [moved]=next.splice(from,1);next.splice(to,0,moved);return next;}));
  }
  function finishDrag() {
    if(!draggedId)return; const id=draggedId; setDraggedId(null);setSettledId(id);window.setTimeout(()=>setSettledId(null),580);
    startTransition(()=>void reorderAccounts(accounts.map(item=>item.id)));
  }
  function launch(url:string){const popup=window.open("about:blank","_blank");setLaunching(true);window.setTimeout(()=>{if(popup)popup.location.href=url;setLaunching(false);},420);}

  return <>
    <div className="layout-bar"><span>{accounts.length} 个账号 · 自动布局</span><div><BentoAddFlow platforms={platforms} onCreated={()=>router.refresh()}/><button className={editing?"button active":"button"} onClick={()=>{setEditing(!editing);setSelectedId(null);setMenuId(null);}}><Grip size={15}/>{editing?"完成":"编辑布局"}</button></div></div>
    <div className={`bento-canvas${editing?" is-editing":""}`} onClick={()=>{setSelectedId(null);setMenuId(null)}}>
      {accounts.map(account=><BentoCard key={account.id} account={account} editing={editing} selected={selectedId===account.id} dragging={draggedId===account.id} settled={settledId===account.id} menuOpen={menuId===account.id}
        cardRef={el=>{if(el)refs.current.set(account.id,el);else refs.current.delete(account.id)}} onSelect={()=>setSelectedId(account.id)} onMenu={()=>setMenuId(menuId===account.id?null:account.id)}
        onDragStart={()=>{setDraggedId(account.id);setSelectedId(account.id)}} onDragEnter={()=>moveOver(account.id)} onDragEnd={finishDrag}
        onResize={size=>resize(account.id,size)} onPin={()=>pin(account.id,!account.pinned)} onLaunch={launch}/>) }
    </div>
    {launching&&<div className="page-launch"><span><Link2 size={20}/></span><p>正在打开链接</p></div>}
  </>;
}

function BentoCard({account,editing,selected,dragging,settled,menuOpen,cardRef,onSelect,onMenu,onDragStart,onDragEnter,onDragEnd,onResize,onPin,onLaunch}:{account:BentoAccount;editing:boolean;selected:boolean;dragging:boolean;settled:boolean;menuOpen:boolean;cardRef:(el:HTMLElement|null)=>void;onSelect:()=>void;onMenu:()=>void;onDragStart:()=>void;onDragEnter:()=>void;onDragEnd:()=>void;onResize:(size:BentoSize)=>void;onPin:()=>void;onLaunch:(url:string)=>void}) {
  const size=(["compact","standard","wide","large"].includes(account.bentoSize)?account.bentoSize:"standard") as BentoSize;
  const identifier=account.username?`@${account.username.replace(/^@/,"")}`:maskEmail(account.email)||account.platformUserId||"未设置账号标识";
  const openUrl=safeUrl(account.profileUrl)||safeUrl(account.loginUrl??account.platform.defaultLoginUrl);
  const needsAttention=!account.username&&!account.email&&!account.platformUserId;
  return <article ref={cardRef} className={`bento-card size-${size}${selected?" selected":""}${dragging?" dragging":""}${settled?" settled":""}`} style={{"--accent":account.platform.color} as React.CSSProperties} draggable={editing} onClick={event=>{event.stopPropagation();if(editing)onSelect();}} onDragStart={event=>{event.dataTransfer.effectAllowed="move";onDragStart()}} onDragEnter={event=>{event.preventDefault();onDragEnter()}} onDragOver={event=>event.preventDefault()} onDragEnd={onDragEnd}>
    {editing&&selected&&<div className="card-layout-popover" onClick={e=>e.stopPropagation()}><span><Move size={13}/></span>{sizes.map(({key,label,title})=><button key={key} className={size===key?"active":""} onClick={()=>onResize(key)} title={title}>{label}</button>)}<i/><button className={account.pinned?"active":""} onClick={onPin} title="置顶"><Pin size={12}/></button></div>}
    <div className="bento-content">
      <div className="bento-top"><span className="bento-logo">{account.platform.name.slice(0,1).toUpperCase()}</span><span className="bento-platform">{account.platform.name}</span>{account.pinned&&<Pin size={12} className="pin-indicator"/>}<button className="bento-more" onClick={e=>{e.stopPropagation();onMenu()}}><MoreHorizontal size={17}/></button></div>
      <Link href={`/accounts/${account.id}`} className="bento-main" onClick={e=>editing&&e.preventDefault()}><div className="bento-identity"><div className="bento-avatar">{account.avatarUrl?<img src={account.avatarUrl} alt="" referrerPolicy="no-referrer"/>:account.displayName.slice(0,1).toUpperCase()}</div><div><h2>{account.displayName}</h2><p className="bento-display">{account.username||account.email||account.platformUserId||account.platform.name}</p><p className="bento-identifier">{identifier}</p></div></div><div className="bento-status"><span className={needsAttention?"attention":"healthy"}>{needsAttention?"! 需完善":<><Check size={12}/>正常</>}</span>{account.vaultItemHint&&<span className="healthy"><LockKeyhole size={11}/>Vault</span>}{size==="large"&&<span className="neutral">手工维护</span>}</div>{size==="large"&&<div className="bento-services"><span>Profile</span><span>Login</span><span>Vaultwarden</span></div>}</Link>
      <div className="bento-bottom"><span>{account.tags.slice(0,2).map(({tag})=>tag.name).join(" · ")||"数字身份"}</span>{openUrl&&<button onClick={e=>{e.stopPropagation();onLaunch(openUrl)}} title="打开平台"><ArrowUpRight size={16}/></button>}</div>
    </div>
    {menuOpen&&!editing&&<div className="card-menu" onClick={e=>e.stopPropagation()}><Link href={`/accounts/${account.id}/edit`}>编辑账号</Link><button onClick={onPin}>{account.pinned?"取消置顶":"置顶账号"}</button><form action={toggleFavorite.bind(null,account.id)}><button><Star size={13}/>{account.favorite?"取消收藏":"收藏"}</button></form><div className="menu-sizes">{sizes.map(({key,label})=><button key={key} className={size===key?"active":""} onClick={()=>onResize(key)}>{label}</button>)}</div></div>}
  </article>;
}
