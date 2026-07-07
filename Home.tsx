import { useAuth } from "@/contexts/AuthContext";

export default function RetailerHome() {
  const { retailer, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between px-6 py-4 border-b border-ink/5">
        <h1 className="text-lg font-display">{retailer?.shop_name ?? "Wholesale Portal"}</h1>
        <button onClick={signOut} className="btn-outline text-xs px-4 py-2">Sign out</button>
      </header>
      <main className="px-6 py-10">
        <p className="text-ink/60 text-sm max-w-md">
          Retailer home screen — product catalog, search, and categories arrive in Phase 2.
        </p>
      </main>
    </div>
  );
}
