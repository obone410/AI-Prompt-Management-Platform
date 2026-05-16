import { publicConfig } from "@/lib/config";
import { serverConfig } from "@/lib/server-config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function hasSupabaseSession() {
  if (!publicConfig.isSupabaseConfigured) {
    return false;
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return false;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return Boolean(user);
}

export async function requiresLiveProviderSession(demoMode: boolean) {
  if (demoMode) {
    return false;
  }

  return serverConfig.isOpenAiConfigured && publicConfig.isSupabaseConfigured;
}
