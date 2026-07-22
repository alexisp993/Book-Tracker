import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — header photos run larger than a screenshot.

// POST /api/groups/image — upload a collection/shelf header image to Vercel
// Blob, returning its public URL. Same two-step pattern as the feedback
// screenshot upload: the client uploads here first, then saves the returned
// URL on the group via the normal JSON create/update route.
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Image upload isn't configured on this deployment yet (no Vercel Blob store connected).",
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
      { error: "Image is too large (max 4MB)." },
      { status: 400 },
    );
  }

  const ext = file.type.split("/")[1];
  const pathname = `groups/${user.id}/${Date.now()}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
