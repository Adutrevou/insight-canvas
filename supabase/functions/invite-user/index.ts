// Invites a user to a client workspace by email.
// Creates the auth user (if needed) and inserts client_members row with role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { email, client_id, role } = await req.json();
    if (!email || !client_id || !role) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supaUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: who } = await userClient.auth.getUser();
    if (!who.user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...cors, "content-type": "application/json" } });

    const admin = createClient(supaUrl, serviceKey);

    // Verify caller is client_admin or super_admin for the target client
    const { data: isAdmin } = await admin.rpc("is_client_admin", { _user_id: who.user.id, _client_id: client_id });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "content-type": "application/json" } });

    // Find existing user by email
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = list?.users?.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
    if (found) {
      userId = found.id;
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        password: crypto.randomUUID().slice(0, 16) + "Aa1!",
      });
      if (cErr || !created.user) {
        return new Response(JSON.stringify({ error: cErr?.message ?? "Could not create user" }), { status: 400, headers: { ...cors, "content-type": "application/json" } });
      }
      userId = created.user.id;
    }

    // Upsert membership
    const { error: mErr } = await admin
      .from("client_members")
      .upsert({ client_id, user_id: userId, role }, { onConflict: "client_id,user_id" });
    if (mErr) return new Response(JSON.stringify({ error: mErr.message }), { status: 400, headers: { ...cors, "content-type": "application/json" } });

    return new Response(JSON.stringify({ ok: true, user_id: userId, email }), { headers: { ...cors, "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "content-type": "application/json" } });
  }
});
