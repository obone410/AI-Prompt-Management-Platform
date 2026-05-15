"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicConfig } from "@/lib/config";

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  if (!publicConfig.isSupabaseConfigured) {
    return null;
  }

  browserClient ??= createBrowserClient(
    publicConfig.supabaseUrl,
    publicConfig.supabasePublishableKey,
  );

  return browserClient;
}
