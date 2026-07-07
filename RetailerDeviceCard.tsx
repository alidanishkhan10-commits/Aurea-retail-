import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Device {
  id: string;
  device_label: string | null;
  registered_at: string;
  last_seen_at: string;
  is_active: boolean;
  authorized_multi_device: boolean;
}

interface Activity {
  total_opens: number;
  opens_today: number;
  last_open_at: string | null;
}

/**
 * Shown inside a retailer's profile in the admin dashboard (Phase 3 wires
 * this into the full retailer detail page). Displays the registered device
 * and the simple activity counters only — no detailed analytics, per spec.
 */
export default function RetailerDeviceCard({ retailerId }: { retailerId: string }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void load();
  }, [retailerId]);

  async function load() {
    setLoading(true);
    const [{ data: deviceRows }, { data: activityRow }] = await Promise.all([
      supabase.from("registered_devices").select("*").eq("retailer_id", retailerId),
      supabase.from("retailer_app_activity").select("*").eq("retailer_id", retailerId).maybeSingle()
    ]);
    setDevices(deviceRows ?? []);
    setActivity(activityRow ?? null);
    setLoading(false);
  }

  async function removeDevice(deviceId: string) {
    await supabase.from("registered_devices").update({ is_active: false }).eq("id", deviceId);
    void load();
  }

  if (loading) return <p className="text-sm text-ink/40">Loading device info…</p>;

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h3 className="text-sm font-medium mb-3">Registered device</h3>
        {devices.filter((d) => d.is_active).length === 0 && (
          <p className="text-sm text-ink/50">No device registered yet.</p>
        )}
        {devices
          .filter((d) => d.is_active)
          .map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-ink/5 last:border-0">
              <div>
                <p>{d.device_label ?? "Unknown device"}</p>
                <p className="text-ink/40 text-xs">
                  Registered {new Date(d.registered_at).toLocaleDateString()} · Last seen{" "}
                  {new Date(d.last_seen_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => removeDevice(d.id)} className="text-xs text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">App activity</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-display">{activity?.total_opens ?? 0}</p>
            <p className="text-xs text-ink/40">Total opens</p>
          </div>
          <div>
            <p className="text-2xl font-display">{activity?.opens_today ?? 0}</p>
            <p className="text-xs text-ink/40">Opens today</p>
          </div>
          <div>
            <p className="text-sm font-display pt-1">
              {activity?.last_open_at ? new Date(activity.last_open_at).toLocaleString() : "—"}
            </p>
            <p className="text-xs text-ink/40">Last open</p>
          </div>
        </div>
      </div>
    </div>
  );
}
