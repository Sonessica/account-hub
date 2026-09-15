import Link from "next/link";
import {db} from "@/lib/db";
import {requireUser} from "@/lib/auth";
import {createAccount} from "@/app/actions";
import {Header} from "@/components/header";
import {AccountForm} from "@/components/account-form";
export default async function NewAccount({searchParams}:{searchParams:Promise<{error?:string}>}){await requireUser();const platforms=await db.platform.findMany({orderBy:{name:"asc"}}),{error}=await searchParams;return <><Header/><main className="shell narrow"><div className="page-title"><div><Link href="/">← 返回</Link><h1>添加账号</h1><p>仅保存身份资料和访问入口，不保存登录密码。</p></div></div><AccountForm platforms={platforms} action={createAccount} error={error}/></main></>}
