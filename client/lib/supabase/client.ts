import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zmpvqrtpuqlptjsaefgz.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AlUyoG94Qoy3BSWyU1lvVA_jTAFoYpn";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
