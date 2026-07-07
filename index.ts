// supabase/functions/create-retailer/index.ts
//
// Deploy with: supabase functions deploy create-retailer
//
// Called by the admin dashboard (Phase 3) to create a retailer's login
// account. This has to run server-side because creating a user with a
// specific password and a pre-confirmed phone number requires the SERVICE
// ROLE key — a key that must never reach the browser. Supabase injects
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY into every Edge Function
// automatically, so no extra secrets setup is needed beyond deploying this.
//
// Request body:
//   {
//     phone: string,            // e.g. "+919876543210"
//     password: string,         // temporary password, retailer can change later
//     shop_name: string,
//     owner_name: string,
//     gst_number?: string,
//     address?: string, state?: string, city?: string, pincode?: string,
//     credit_limit?: number
//   }
//
// Only callable by an already-authenticated admin (checked below via the
// caller's own JWT against the `profiles` table).

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  // Client bound to the caller's own JWT, used only to verify they're an admin.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const { data: profile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 });
  }

  const body = await req.json();
  const { phone, password, shop_name, owner_name, gst_number, address, state, city, pincode, credit_limit } = body;

  if (!phone || !password || !shop_name || !owner_name) {
    return new Response(JSON.stringify({ error: "phone, password, shop_name, owner_name are required" }), {
      status: 400
    });
  }

  // Admin client with full privileges, used only inside this trusted function.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true // skips SMS OTP entirely — admin is vouching for this account
  });
  if (createErr || !created.user) {
    return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), { status: 400 });
  }

  const { error: profileErr } = await adminClient
    .from("profiles")
    .insert({ id: created.user.id, role: "retailer" });
  if (profileErr) {
    return new Response(JSON.stringify({ error: profileErr.message }), { status: 400 });
  }

  const { data: retailer, error: retailerErr } = await adminClient
    .from("retailers")
    .insert({
      user_id: created.user.id,
      shop_name,
      owner_name,
      phone_number: phone,
      gst_number,
      address,
      state,
      city,
      pincode,
      credit_limit: credit_limit ?? 0
    })
    .select()
    .single();
  if (retailerErr) {
    return new Response(JSON.stringify({ error: retailerErr.message }), { status: 400 });
  }

  return new Response(JSON.stringify({ retailer }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
