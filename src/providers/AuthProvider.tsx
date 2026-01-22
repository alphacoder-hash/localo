import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  roles: Set<string>;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        void supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", nextSession.user.id)
          .then(({ data }) => {
            setRoles(new Set((data ?? []).map((r) => r.role)));
            setLoading(false);
          });
      } else {
        setRoles(new Set());
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);

      if (data.session?.user) {
        setLoading(true);
        void supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .then(({ data: rolesData }) => {
            setRoles(new Set((rolesData ?? []).map((r) => r.role)));
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      roles,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, user, roles, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
