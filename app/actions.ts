"use server";
import argon2 from "argon2";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { accountSchema, setupSchema } from "@/lib/validation";
import { createSession, destroySession, requireUser } from "@/lib/auth";
const text=(f:FormData,k:string)=>String(f.get(k)??"").trim();
const values=(f:FormData)=>({platformId:text(f,"platformId"),displayName:text(f,"displayName"),username:text(f,"username"),platformUserId:text(f,"platformUserId"),avatarUrl:text(f,"avatarUrl"),bio:text(f,"bio"),email:text(f,"email"),phone:text(f,"phone"),profileUrl:text(f,"profileUrl"),loginUrl:text(f,"loginUrl"),managementUrl:text(f,"managementUrl"),vaultItemHint:text(f,"vaultItemHint"),notes:text(f,"notes"),tags:text(f,"tags")});
const withError=(path:string,message:string)=>`${path}?error=${encodeURIComponent(message)}`;
async function tagLinks(tags:string){const names=[...new Set(tags.split(/[,，]/).map(v=>v.trim()).filter(Boolean))].slice(0,20);return{create:names.map(name=>({tag:{connectOrCreate:{where:{name},create:{name}}}}))};}
export async function setup(form:FormData){if(await db.user.count())redirect("/login");const p=setupSchema.safeParse({username:text(form,"username"),password:text(form,"password")});if(!p.success)redirect(withError("/setup","用户名至少3位，密码至少12位"));const user=await db.user.create({data:{username:p.data.username,passwordHash:await argon2.hash(p.data.password,{type:argon2.argon2id})}});await db.auditLog.create({data:{action:"ADMIN_CREATED"}});await createSession(user.id);redirect("/");}
export async function login(form:FormData){const username=text(form,"username"),password=text(form,"password"),user=await db.user.findUnique({where:{username}});if(!user||!(await argon2.verify(user.passwordHash,password)))redirect(withError("/login","用户名或密码错误"));await createSession(user.id);await db.auditLog.create({data:{action:"LOGIN"}});redirect("/");}
export async function logout(){await destroySession();redirect("/login");}
export async function createAccount(form:FormData){await requireUser();const p=accountSchema.safeParse(values(form));if(!p.success)redirect(withError("/accounts/new","请检查必填项、邮箱和网址格式"));const{tags,...data}=p.data;const account=await db.account.create({data:{...data,tags:await tagLinks(tags??"")}});await db.auditLog.create({data:{action:"ACCOUNT_CREATE",accountId:account.id,detail:account.displayName}});redirect(`/accounts/${account.id}`);}
export async function updateAccount(id:string,form:FormData){await requireUser();const p=accountSchema.safeParse(values(form));if(!p.success)redirect(withError(`/accounts/${id}/edit`,"请检查必填项、邮箱和网址格式"));const{tags,...data}=p.data;await db.account.update({where:{id},data:{...data,tags:{deleteMany:{},...(await tagLinks(tags??""))}}});await db.auditLog.create({data:{action:"ACCOUNT_UPDATE",accountId:id}});revalidatePath("/");redirect(`/accounts/${id}`);}
export async function deleteAccount(id:string){await requireUser();const account=await db.account.findUniqueOrThrow({where:{id}});await db.auditLog.create({data:{action:"ACCOUNT_DELETE",detail:account.displayName}});await db.account.delete({where:{id}});revalidatePath("/");redirect("/");}
export async function toggleFavorite(id:string){await requireUser();const a=await db.account.findUniqueOrThrow({where:{id}});await db.account.update({where:{id},data:{favorite:!a.favorite}});revalidatePath("/");revalidatePath(`/accounts/${id}`);}
