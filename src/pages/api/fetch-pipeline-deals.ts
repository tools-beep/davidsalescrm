import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn(
    "[fetch-pipeline-deals] Missing SUPABASE env vars. Requests will fail."
  );
}

const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({
      success: false,
      error: "Supabase admin client not configured",
    });
  }

  const { pipelineId, limit = 2000 } = req.body || {};

  if (!pipelineId) {
    return res
      .status(400)
      .json({ success: false, error: "pipelineId is required" });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("deals")
      .select(
        `
          *,
          companies (id, name, phone),
          contacts:primary_contact_id (id, first_name, last_name, phone)
        `
      )
      .eq("pipeline_id", pipelineId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[fetch-pipeline-deals] Supabase error:", error);
      return res.status(200).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      deals: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (err: any) {
    console.error("[fetch-pipeline-deals] Unexpected error:", err);
    return res.status(200).json({
      success: false,
      error: err?.message || "Unexpected error",
    });
  }
}


