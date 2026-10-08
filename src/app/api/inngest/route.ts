import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { bookmarkIngestion } from "../../../lib/inngest/functions/bookmark-ingestion";
import {
  linkHealthOnDemandCheck,
  linkHealthWeeklySweep,
} from "../../../lib/inngest/functions/link-health";

export const runtime = "nodejs";
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    bookmarkIngestion,
    linkHealthWeeklySweep,
    linkHealthOnDemandCheck,
  ],
});
