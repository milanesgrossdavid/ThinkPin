import { SmartResurfacing } from "./smart-resurfacing";
import {
  getResurfacingCandidates,
  type ResurfacingResult,
} from "../../lib/resurfacing/service";
import { createClient } from "../../lib/supabase/server";

export async function SmartResurfacingSection() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) return null;

  let result: ResurfacingResult;
  try {
    result = await getResurfacingCandidates(supabase, user.id);
  } catch (error) {
    console.error("Smart Resurfacing failed to load.", error);
    result = {
      candidates: [],
      error:
        "Smart Resurfacing could not load right now. Please try again later.",
    };
  }
  return (
    <SmartResurfacing candidates={result.candidates} error={result.error} />
  );
}
