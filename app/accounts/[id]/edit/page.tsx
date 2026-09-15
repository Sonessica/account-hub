import Link from "next/link";
import {notFound} from "next/navigation";
import {db} from "@/lib/db";
import {requireUser} from "@/lib/auth";
import {updateAccount} from "@/app/actions";
import {Header} from "@/components/header";
import {AccountForm} from "@/components/account-form";
export default async function Edit({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{error?:string}>}){await requireUser();const{id}=await params;const[account,platforms]=await Promise.all([db.account.findUnique({where:{id},include:{tags:{include:{tag:true}}}}),db.platform.findMany({orderBy:{name:"asc"}})]);if(!account)notFound();const{error}=await searchParams;return <><Header/><main className="shell narrow"><div className="page-title"><div><Link href={`/accounts/${id}`}>← 返回详情</Link><h1>编辑 {account.displayName}</h1></div></div><AccountForm platforms={platforms} account={account} action={updateAccount.bind(null,id)} error={error}/></main></>}
