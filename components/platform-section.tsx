"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";

export function PlatformSection({ platformKey, name, color, count, children }: { platformKey: string; name: string; color: string; count: number; children: ReactNode }) {
  const storageKey = `account-hub:platform:${platformKey}:collapsed`;
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    // Restore a browser-only preference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);
  function toggle() { setCollapsed((current) => { localStorage.setItem(storageKey, current ? "0" : "1"); return !current; }); }
  return <section className="platform-section" style={{ "--platform-color": color } as React.CSSProperties}>
    <div className="platform-heading"><button className="platform-toggle" onClick={toggle} aria-expanded={!collapsed}><span className="platform-symbol">{name.slice(0, 1).toUpperCase()}</span><strong>{name}</strong><span className="platform-count">{count}</span><ChevronDown className={collapsed ? "collapsed" : ""} size={16}/></button><div className="platform-tools"><Link href={`/accounts/new?platform=${encodeURIComponent(platformKey)}`} title={`添加 ${name} 账号`}><Plus size={16}/></Link><button title="平台操作"><MoreHorizontal size={17}/></button></div></div>
    {!collapsed && <div className="account-grid grouped-grid">{children}</div>}
  </section>;
}
