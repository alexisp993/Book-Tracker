import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2MB — generous for a screenshot, well
// under Vercel's serverless function request-body limit.

// POST /api/feedback/screenshot — upload a feedback screenshot to Vercel
// Blob, returning its public URL. Called before the main feedback submission
// (two-step: upload → get URL → submit feedback as plain JSON with that URL)
// so /api/feedback itself stays a simple JSON endpoint like every other
// route in the app, rather than handling multipart directly.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Screenshot upload isn't configured on this deployment yet (no Vercel Blob store connected). You can still submit feedback without a screenshot.",
      },
      { status: 503 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PNG, JPG, and WEBP images are supported." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image is too large (max 2MB)." },
      { status: 400 },
    );
  }

  const ext = file.type.split("/")[1];
  const pathname = `feedback/${user.id}/${Date.now()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
