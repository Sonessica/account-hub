import {db} from "@/lib/db";
export async function GET(){try{await db.$queryRaw`SELECT 1`;return Response.json({status:"ok",database:"ok",version:"1.2.0"})}catch{return Response.json({status:"error",database:"error",version:"1.2.0"},{status:503})}}
