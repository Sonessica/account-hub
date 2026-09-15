import Link from "next/link";
import {redirect} from "next/navigation";
import {db} from "@/lib/db";
import {currentUser} from "@/lib/auth";
import {login} from "@/app/actions";
export default async function Login({searchParams}:{searchParams:Promise<{error?:string}>}){if(await currentUser())redirect("/");if(!(await db.user.count()))redirect("/setup");const{error}=await searchParams;return <main className="auth-page"><div className="auth-card"><div className="brand-mark large">A</div><p className="eyebrow">ACCOUNT HUB</p><h1>欢迎回来</h1><p>登录你的私人数字身份中心</p>{error&&<div className="alert">{error}</div>}<form action={login}><label>用户名<input name="username" autoComplete="username" required autoFocus/></label><label>密码<input name="password" type="password" autoComplete="current-password" required/></label><button className="button primary wide">登录</button></form><small>密码不会离开这台服务器。<Link href="/"> 返回首页</Link></small></div></main>}
