import { ci, prisma } from "@/lib/prisma";
import type { FeedbackStatus, FeedbackType } from "@/lib/constants";
import type { AdminFeedbackQuery, CreateFeedbackInput } from "@/lib/validation";
import type { Paginated } from "@/lib/types";

// The user-facing shape — deliberately omits `adminNotes` (admin-internal
// only, per spec: "Add internal notes" implies not visible to the user who
// submitted the feedback). Admin views use the separate AdminFeedbackDetail
// type below, which does include it.
export interface FeedbackDTO {
  id: string;
  type: FeedbackType;
  subject: string;
  description: string;
  screenshotUrl: string | null;
  page: string | null;
  browser: string | null;
  deviceType: string | null;
  appVersion: string | null;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeedbackRow {
  id: string;
  type: FeedbackType;
  subject: string;
  status: FeedbackStatus;
  createdAt: string;
  user: { name: string | null; email: string };
}

export interface AdminFeedbackDetail extends AdminFeedbackRow {
  description: string;
  screenshotUrl: string | null;
  page: string | null;
  browser: string | null;
  deviceType: string | null;
  appVersion: string | null;
  adminNotes: string | null;
}

function toFeedbackDTO(f: {
  id: string;
  type: string;
  subject: string;
  description: string;
  screenshotUrl: string | null;
  page: string | null;
  browser: string | null;
  deviceType: string | null;
  appVersion: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): FeedbackDTO {
  return {
    id: f.id,
    type: f.type as FeedbackType,
    subject: f.subject,
    description: f.description,
    screenshotUrl: f.screenshotUrl,
    page: f.page,
    browser: f.browser,
    deviceType: f.deviceType,
    appVersion: f.appVersion,
    status: f.status as FeedbackStatus,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

export async function createFeedback(
  userId: string,
  input: CreateFeedbackInput,
): Promise<FeedbackDTO> {
  const row = await prisma.feedback.create({
    data: { userId, ...input },
  });
  return toFeedbackDTO(row);
}

// A user's own submissions only — newest first, no pagination needed at
// personal-feedback-volume scale (mirrors how shelves/collections lists work).
export async function listMyFeedback(userId: string): Promise<FeedbackDTO[]> {
  const rows = await prisma.feedback.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toFeedbackDTO);
}

export async function adminListFeedback(
  query: AdminFeedbackQuery,
): Promise<Paginated<AdminFeedbackRow>> {
  const where: Record<string, unknown> = {};
  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;
  if (query.q) {
    where.OR = [
      { subject: ci(query.q) },
      { description: ci(query.q) },
      { user: { name: ci(query.q) } },
      { user: { email: ci(query.q) } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type as FeedbackType,
      subject: r.subject,
      status: r.status as FeedbackStatus,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function adminGetFeedback(
  id: string,
): Promise<AdminFeedbackDetail | null> {
  const row = await prisma.feedback.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    type: row.type as FeedbackType,
    subject: row.subject,
    description: row.description,
    screenshotUrl: row.screenshotUrl,
    page: row.page,
    browser: row.browser,
    deviceType: row.deviceType,
    appVersion: row.appVersion,
    status: row.status as FeedbackStatus,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt.toISOString(),
    user: row.user,
  };
}

export async function adminUpdateFeedback(
  id: string,
  data: { status?: string; adminNotes?: string },
): Promise<AdminFeedbackDetail | null> {
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.feedback.update({ where: { id }, data });
  return adminGetFeedback(id);
}
