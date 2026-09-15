import Link from "next/link";
import {LayoutGrid,LogOut,Plus,Settings} from "lucide-react";
import {logout} from "@/app/actions";
export function Header(){return <header className="topbar"><Link href="/" className="brand"><span className="brand-mark"><LayoutGrid size={17}/></span><span><b>Accounts</b><small>Identity workspace</small></span></Link><nav><Link href="/accounts/new" className="button primary"><Plus size={16}/>添加账号</Link><Link href="/settings" className="icon-button" title="设置"><Settings size={18}/></Link><form action={logout}><button className="icon-button" title="退出"><LogOut size={18}/></button></form></nav></header>}
