import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { createFeedback, listMyFeedback } from "@/lib/feedback";
import { createFeedbackSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/feedback — the current user's own feedback only.
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json(await listMyFeedback(user.id));
}

// POST /api/feedback — submit feedback. Context (page/browser/deviceType/
// appVersion) is captured client-side and passed in the body, never derived
// from anything the user typed in a form field.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createFeedbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const feedback = await createFeedback(user.id, parsed.data);
  return NextResponse.json(feedback, { status: 201 });
}
