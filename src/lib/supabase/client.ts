import { createClient } from "@supabase/supabase-js";

// Browser/server-shared read client. No user auth in this product (public data
// site, nothing writable) so a plain client is enough — RLS does the rest.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
