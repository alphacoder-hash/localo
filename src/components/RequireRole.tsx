import { Navigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";

export function RequireRole({ role, children }: { role: string; children: React.ReactNode }) {
  const { roles, loading, user } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!roles.has(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
