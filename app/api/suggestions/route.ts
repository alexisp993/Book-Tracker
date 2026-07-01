import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { getSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  const suggestions = await getSuggestions(user.id);
  return NextResponse.json(suggestions);
}
