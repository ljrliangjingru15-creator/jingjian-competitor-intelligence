import { createClient } from "@supabase/supabase-js";
export function getSupabaseAdmin(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
export const storageBucket=()=>process.env.SUPABASE_STORAGE_BUCKET||"competitor-assets";
export function describeSupabaseError(error:unknown){if(error instanceof Error)return error.message;if(error&&typeof error==="object"){const e=error as Record<string,unknown>;return [e.message,e.code&&`code=${e.code}`,e.details&&`details=${e.details}`,e.hint&&`hint=${e.hint}`].filter(Boolean).join(" · ")}return String(error||"未知Supabase错误")}
