import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getDeviceId, getDeviceLabel } from "@/lib/device";
import type { UserRole } from "@/types/database.types";

interface RetailerProfile {
  id: string;
  shop_name: string;
  is_enabled: boolean;
}

interface AuthState {
  session: Session | null;
  role: UserRole | null;
  retailer: RetailerProfile | null;
  loading: boolean;
  /** true once we've confirmed this browser/device is the retailer's authorized device */
  deviceApproved: boolean;
  deviceCheckError: string | null;
  signIn: (phone: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [retailer, setRetailer] = useState<RetailerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceApproved, setDeviceApproved] = useState(false);
  const [deviceCheckError, setDeviceCheckError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setRole(null);
      setRetailer(null);
      setDeviceApproved(false);
      setLoading(false);
      return;
    }
    void loadProfileAndDevice(session.user.id);
  }, [session]);

  async function loadProfileAndDevice(userId: string) {
    setLoading(true);
    setDeviceCheckError(null);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    const userRole = profile?.role ?? "retailer";
    setRole(userRole);

    if (userRole === "admin") {
      // Admins aren't subject to the single-device lock.
      setDeviceApproved(true);
      setLoading(false);
      return;
    }

    const { data: retailerRow } = await supabase
      .from("retailers")
      .select("id, shop_name, is_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (!retailerRow) {
      setDeviceCheckError("No retailer profile is linked to this account yet. Contact the admin.");
      setLoading(false);
      return;
    }
    setRetailer(retailerRow);

    if (!retailerRow.is_enabled) {
      setDeviceCheckError("This account has been disabled. Contact the admin.");
      setLoading(false);
      return;
    }

    await enforceDeviceLock(retailerRow.id);
    setLoading(false);
  }

  /**
   * Single-device enforcement:
   * - No device registered yet -> register this one automatically.
   * - This device already registered -> touch last_seen_at, proceed.
   * - A *different* device is registered and multi-device isn't authorized
   *   -> block, with a clear message. Admin can free the slot from their side.
   */
  async function enforceDeviceLock(retailerId: string) {
    const deviceId = getDeviceId();

    const { data: devices } = await supabase
      .from("registered_devices")
      .select("*")
      .eq("retailer_id", retailerId)
      .eq("is_active", true);

    const thisDevice = devices?.find((d) => d.device_id === deviceId);
    const otherActiveDevice = devices?.find((d) => d.device_id !== deviceId);

    if (thisDevice) {
      await supabase
        .from("registered_devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", thisDevice.id);
      setDeviceApproved(true);
    } else if (!otherActiveDevice) {
      await supabase.from("registered_devices").insert({
        retailer_id: retailerId,
        device_id: deviceId,
        device_label: getDeviceLabel()
      });
      setDeviceApproved(true);
    } else if (otherActiveDevice.authorized_multi_device) {
      await supabase.from("registered_devices").insert({
        retailer_id: retailerId,
        device_id: deviceId,
        device_label: getDeviceLabel()
      });
      setDeviceApproved(true);
    } else {
      setDeviceApproved(false);
      setDeviceCheckError(
        "This account is already signed in on another device. Ask the admin to remove the old device before signing in here."
      );
    }

    // Simple activity ping — total opens, opens today, last open time only.
    await supabase.rpc("record_app_open", { p_retailer_id: retailerId });
  }

  async function signIn(phone: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ phone, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        role,
        retailer,
        loading,
        deviceApproved,
        deviceCheckError,
        signIn,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
