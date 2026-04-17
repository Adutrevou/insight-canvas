// One-shot helper to provision demo users for the two seeded clients.
// Safe to call repeatedly — upserts users by email and memberships.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMOS = [
  { email: "hotel@intergrai.co.za", password: "Hotel123", client_id: "18a43662-9240-4c9b-84dc-933b44cd848f" },
  { email: "risk@intergrai.co.za", password: "Risk123", client_id: "2b503853-eda5-431c-8846-19a254e71f43" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supaUrl, serviceKey);

  const results: Array<Record<string, unknown>> = [];
  for (const d of DEMOS) {
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users?.find((u) => u.email?.toLowerCase() === d.email.toLowerCase());
    if (found) {
      userId = found.id;
      await admin.auth.admin.updateUserById(found.id, { password: d.password, email_confirm: true });
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: d.email, password: d.password, email_confirm: true,
      });
      if (error || !created.user) { results.push({ email: d.email, error: error?.message }); continue; }
      userId = created.user.id;
    }
    const { error: mErr } = await admin
      .from("client_members")
      .upsert({ client_id: d.client_id, user_id: userId!, role: "user" }, { onConflict: "client_id,user_id" });
    results.push({ email: d.email, user_id: userId, member_error: mErr?.message ?? null });
  }
  return new Response(JSON.stringify({ ok: true, results }), { headers: { ...cors, "content-type": "application/json" } });
});
