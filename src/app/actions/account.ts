"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function deleteAccount(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (confirmation !== "DELETE" || password.length < 8) {
    redirect("/profile?challenge=delete&error=Type%20DELETE%20and%20enter%20your%20password%20to%20confirm.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw new Error(`Could not verify session: ${userError.message}`);
  if (!user?.email) redirect("/login");

  const { error: reauthError } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (reauthError) redirect("/profile?challenge=delete&error=The%20current%20password%20is%20incorrect.");

  const imagePaths: string[] = [];
  for (let from = 0; ; from += 500) {
    const { data: items, error: itemsError } = await supabase
      .from("closet_items")
      .select("id, image_url")
      .eq("user_id", user.id)
      .order("id", { ascending: true })
      .range(from, from + 499);
    if (itemsError) throw new Error(`Could not prepare account deletion: ${itemsError.message}`);
    imagePaths.push(...items.map((item) => item.image_url).filter((path): path is string => Boolean(path)));
    if (items.length < 500) break;
  }

  const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
  if (signOutError) throw new Error(`Could not clear the account session: ${signOutError.message}`);

  const admin = createSupabaseAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) throw new Error(`Could not delete account: ${deleteError.message}`);

  for (let offset = 0; offset < imagePaths.length; offset += 100) {
    const { error: storageError } = await admin.storage.from("closet-images").remove(imagePaths.slice(offset, offset + 100));
    if (storageError) {
      console.error("Account was deleted, but some closet images could not be removed.", { userId: user.id, error: storageError.message });
      redirect("/login?error=Account%20deleted%2C%20but%20some%20images%20could%20not%20be%20removed.%20Contact%20support.");
    }
  }

  redirect("/?message=Your%20account%20and%20closet%20data%20were%20deleted.");
}
