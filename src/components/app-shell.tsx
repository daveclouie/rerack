import { isAuthSessionMissingError } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { AppFrame } from "@/components/app-frame";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  let isAuthenticated = false;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && !isAuthSessionMissingError(error)) throw new Error(`Could not verify session: ${error.message}`);
    isAuthenticated = Boolean(user);
  }

  return <AppFrame isAuthenticated={isAuthenticated}>{children}</AppFrame>;
}
