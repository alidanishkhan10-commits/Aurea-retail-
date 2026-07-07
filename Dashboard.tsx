import { useAuth } from "@/contexts/AuthContext";

export default function AdminDashboard() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between px-6 py-4 border-b border-ink/5">
        <h1 className="text-lg font-display">Admin Dashboard</h1>
        <button onClick={signOut} className="btn-outline text-xs px-4 py-2">Sign out</button>
      </header>
      <main className="px-6 py-10">
        <p className="text-ink/60 text-sm max-w-md">
          Sales cards, charts, retailer management (including registered devices
          and app-open counters), and inventory arrive in Phase 3.
        </p>
      </main>
    </div>
  );
}
