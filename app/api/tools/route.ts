import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tools")
    .select(`
      id,
      name,
      slug,
      short_description,
      website_url,
      logo_url,
      verification_status,
      companies (
        id,
        name,
        logo_url
      )
    `)
    .eq("status", "ACTIVE")
    .order("name");

  if (error) {
    console.error("TOOLS API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    count: data.length,
    tools: data,
  });
}