"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronLeft, Link2, Plus, Sparkles, UserRound, X } from "lucide-react";
import type { Platform } from "@prisma/client";
import { createAccountInline } from "@/app/actions";

export function BentoAddFlow({ platforms, onCreated }: { platforms: Platform[]; onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type"|"form"|"success">("type");
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  function close(){ if(pending)return; setOpen(false); window.setTimeout(()=>{setStep("type");setError("");},260); }
  useEffect(()=>{const key=(event:KeyboardEvent)=>event.key==="Escape"&&close();window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);});
  async function submit(formData:FormData){setError("");startTransition(async()=>{const result=await createAccountInline(formData);if(!result.ok){setError(result.error);return;}setStep("success");window.setTimeout(()=>{close();onCreated?.();},900);});}

  return <>
    <button className="button primary add-account-trigger" onClick={()=>setOpen(true)}><Plus size={16}/>添加账号</button>
    {open&&<div className="add-overlay" role="presentation" onMouseDown={(event)=>event.target===event.currentTarget&&close()}>
      <div className={`add-dialog step-${step}`} ref={dialogRef} role="dialog" aria-modal="true" aria-label="添加账号">
        <button className="add-close" onClick={close} aria-label="关闭"><X size={17}/></button>
        {step==="type"&&<div className="add-stage add-enter">
          <span className="add-kicker"><Sparkles size={13}/> ADD TO YOUR SPACE</span><h2>添加新的账号</h2><p>选择一种内容类型，它会自然加入你的 Bento。</p>
          <div className="add-choices">
            <button onClick={()=>setStep("form")}><span><UserRound size={20}/></span><strong>社交账号</strong><small>用户名、主页与数字身份</small></button>
            <button onClick={()=>setStep("form")}><span><Link2 size={20}/></span><strong>链接账号</strong><small>网站、服务或管理入口</small></button>
          </div>
        </div>}
        {step==="form"&&<form action={submit} className="add-stage add-enter">
          <button type="button" className="add-back" onClick={()=>setStep("type")}><ChevronLeft size={15}/>返回</button>
          <span className="add-kicker">ACCOUNT DETAILS</span><h2>放入你的 Bento</h2><p>只填写必要内容，以后随时可以补充。</p>
          {error&&<div className="add-error">{error}</div>}
          <div className="add-fields">
            <label>平台<select name="platformId" value={platformId} onChange={e=>setPlatformId(e.target.value)} required>{platforms.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label>显示名称<input name="displayName" required maxLength={100} autoFocus placeholder="例如：我的主账号"/></label>
            <label>用户名<input name="username" maxLength={100} placeholder="无需输入 @"/></label>
            <label>个人主页链接<input name="profileUrl" type="url" placeholder="https://"/></label>
          </div>
          <input type="hidden" name="platformUserId"/><input type="hidden" name="avatarUrl"/><input type="hidden" name="bio"/><input type="hidden" name="email"/><input type="hidden" name="phone"/><input type="hidden" name="loginUrl"/><input type="hidden" name="managementUrl"/><input type="hidden" name="vaultItemHint"/><input type="hidden" name="notes"/><input type="hidden" name="tags"/>
          <button className="add-submit" disabled={pending}>{pending?<span className="add-spinner"/>:<Plus size={16}/>} {pending?"正在创建…":"添加到页面"}</button>
        </form>}
        {step==="success"&&<div className="add-success add-enter"><span><Check size={28}/></span><h2>已添加</h2><p>新账号正在落入你的 Bento。</p><i/><i/><i/></div>}
      </div>
    </div>}
  </>;
}
