"use client";
import {useState} from "react";
export function PrivateValue({masked,value}:{masked:string;value:string}){const[revealed,setRevealed]=useState(false);return <span className="private-value">{revealed?value:masked}<button type="button" onClick={()=>setRevealed(v=>!v)}>{revealed?"隐藏":"显示"}</button></span>}
