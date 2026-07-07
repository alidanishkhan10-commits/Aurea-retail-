import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="h-8 w-8 rounded-full border-2 border-ink/10 border-t-gold animate-spin" />
    </div>
  );
}

export function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { session, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to="/login" replace />;
  if (role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Blocks retailers whose device hasn't been approved (single-device lock). */
export function RequireApprovedDevice() {
  const { role, loading, deviceApproved, deviceCheckError } = useAuth();
  if (loading) return <LoadingScreen />;
  if (role === "retailer" && !deviceApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="card max-w-sm w-full p-8 text-center">
          <h1 className="text-xl mb-2">Device not approved</h1>
          <p className="text-sm text-ink/60">
            {deviceCheckError ?? "This device isn't approved for this account yet."}
          </p>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
