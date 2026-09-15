"use client";
import {Trash2} from "lucide-react";
export function DeleteButton({action,name}:{action:()=>Promise<void>;name:string}){return <form action={action} onSubmit={(event)=>{if(!window.confirm(`确定从 Account Hub 删除“${name}”吗？\n\n真实平台账号和 Vaultwarden 条目不会受影响。`))event.preventDefault()}}><button className="button danger"><Trash2 size={16}/>确认删除</button></form>}
