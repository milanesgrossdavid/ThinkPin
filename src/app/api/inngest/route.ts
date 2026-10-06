import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { bookmarkIngestion } from "../../../lib/inngest/functions/bookmark-ingestion";

export const runtime = "nodejs";
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [bookmarkIngestion],
});
