import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/user";
import { getCalendarDays } from "@/lib/calendarData";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);

  const now = new Date();
  const rangeDaysParam = searchParams.get("rangeDays");

  if (rangeDaysParam) {
    // Windowed range mode — powers the Home tab's rolling heatmap preview.
    // offset=0 is the window ending today; offset=1 is the window before
    // that, etc. Shares the exact same builder as the month view below.
    const rangeDays = parseInt(rangeDaysParam, 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    if (isNaN(rangeDays) || rangeDays < 1 || isNaN(offset) || offset < 0) {
      return NextResponse.json({ error: "Invalid rangeDays or offset" }, { status: 400 });
    }

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endExclusive = new Date(startOfToday);
    endExclusive.setDate(endExclusive.getDate() + 1 - offset * rangeDays);
    const start = new Date(endExclusive);
    start.setDate(start.getDate() - rangeDays);

    const days = await getCalendarDays(user.id, start, endExclusive);
    return NextResponse.json(days);
  }

  // Month mode — full calendar page + export.
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid year or month" }, { status: 400 });
  }

  // First and last moment of the requested month (UTC).
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const days = await getCalendarDays(user.id, start, end);
  return NextResponse.json(days);
}
