"use client";

import { useEffect, useState } from "react";
import { createOptionalClient } from "@/lib/supabase-browser";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  email: string | null;
  native_language: string | null;
  onboarding_complete: boolean;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = createOptionalClient();
    if (!client) {
      setLoading(false);
      setUser(null);
      setProfile(null);
      return;
    }

    const supabase = client;

    async function fetchProfile(u: User) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      setProfile(data ?? null);
    }

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      if (u) fetchProfile(u);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) fetchProfile(u);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading };
}
