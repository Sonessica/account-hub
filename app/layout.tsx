import type {Metadata} from "next";
import "./globals.css";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Account Hub",description:"私人数字身份与账号中心",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
