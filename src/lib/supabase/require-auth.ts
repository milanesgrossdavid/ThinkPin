import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function requireAuth() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }
}
