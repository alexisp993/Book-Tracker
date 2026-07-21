"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BackHeader } from "@/components/ui/page-header";
import { Label, Select, Textarea } from "@/components/ui/input";
import { useAdminFeedbackDetail, useUpdateFeedbackStatus } from "@/lib/queries";
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPE_LABELS,
} from "@/lib/constants";
import type { FeedbackStatus, FeedbackType } from "@/lib/constants";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminFeedbackDetail({ id }: { id: string }) {
  const { data: feedback, isLoading } = useAdminFeedbackDetail(id);
  const updateMutation = useUpdateFeedbackStatus();

  const [status, setStatus] = React.useState<string>("");
  const [adminNotes, setAdminNotes] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setAdminNotes(feedback.adminNotes ?? "");
    }
  }, [feedback]);

  async function handleSave() {
    setSaved(false);
    await updateMutation.mutateAsync({
      id,
      input: { status: status as FeedbackStatus, adminNotes },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!feedback) return <p className="text-sm text-muted-foreground">Not found.</p>;

  return (
    <div className="space-y-5">
      <BackHeader href="/admin/feedback" backLabel="Back to all feedback" />

      <Card>
        <p className="text-xs text-muted-foreground">
          {FEEDBACK_TYPE_LABELS[feedback.type as FeedbackType]} ·{" "}
          {formatDateTime(feedback.createdAt)}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold">
          {feedback.subject}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {feedback.user.name ?? "—"} · {feedback.user.email}
        </p>

        <p className="mt-4 whitespace-pre-wrap text-sm">{feedback.description}</p>

        {feedback.screenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={feedback.screenshotUrl}
            alt="Feedback screenshot"
            className="mt-4 max-h-96 rounded-lg border object-contain"
      loading="lazy"
      decoding="async"
    />
        ) : null}

        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
          <div>
            <dt className="font-medium text-foreground">Page</dt>
            <dd>{feedback.page ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Browser</dt>
            <dd className="line-clamp-1">{feedback.browser ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Device</dt>
            <dd>{feedback.deviceType ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">App version</dt>
            <dd>{feedback.appVersion ?? "—"}</dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {FEEDBACK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {FEEDBACK_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="adminNotes">Internal notes</Label>
          <Textarea
            id="adminNotes"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={4}
            placeholder="Not visible to the user"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
          {saved ? (
            <span className="text-sm text-emerald-600">Saved.</span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
