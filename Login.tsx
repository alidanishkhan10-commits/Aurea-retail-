import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSigningIn(true);
    const { error } = await signIn(phone, password);
    setSigningIn(false);
    if (error) {
      setError(error);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone px-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-2xl mb-1">Sign in</h1>
        <p className="text-sm text-ink/60 mb-6">
          Use the phone number and password your admin set up for your account.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="tel"
            required
            placeholder="+91 98765 43210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input-field"
            autoComplete="tel"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={signingIn} className="btn-primary w-full">
            {signingIn ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-ink/40 mt-6">
          Forgot your password? Contact the admin to reset it.
        </p>
      </div>
    </div>
  );
}
