import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const inviteAgent = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; email: string; role: "admin" | "agent" }) => data)
  .handler(async ({ data }) => {
    const { data: inviteData, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { data: { name: data.name } }
    );
    if (error) throw new Error(error.message);
    const userId = inviteData.user.id;
    const { error: dbErr } = await supabaseAdmin.from("agents").upsert({
      id: userId,
      name: data.name,
      email: data.email,
      role: data.role,
      status: "offline",
    });
    if (dbErr) throw new Error(dbErr.message);
    return { id: userId };
  });

export const updateAgent = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; name: string; role: "admin" | "agent" }) => data)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("agents")
      .update({ name: data.name, role: data.role })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
  });

export const removeAgent = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("agents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    // Disable auth user so they can't log in anymore
    await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: "876600h",
    });
  });
