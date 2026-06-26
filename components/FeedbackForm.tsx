"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { ApiRequestError, uploadFeedbackScreenshot } from "@/lib/api";
import { useCreateFeedback } from "@/lib/queries";
import { captureFeedbackContext } from "@/lib/feedbackContext";
import { resizeImageFile } from "@/lib/imageResize";
import { FEEDBACK_TYPES, FEEDBACK_TYPE_LABELS } from "@/lib/constants";
import type { CreateFeedbackInput } from "@/lib/validation";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function FeedbackForm() {
  const pathname = usePathname();
  const createMutation = useCreateFeedback();

  const [type, setType] = React.useState<CreateFeedbackInput["type"]>("BUG");
  const [subject, setSubject] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [screenshot, setScreenshot] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) {
      setScreenshot(null);
      setPreview(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a PNG, JPG, or WEBP image.");
      return;
    }
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let screenshotUrl: string | undefined;
    try {
      if (screenshot) {
        setUploading(true);
        const resized = await resizeImageFile(screenshot);
        const result = await uploadFeedbackScreenshot(resized);
        screenshotUrl = result.url;
      }
    } catch (err) {
      // Screenshot upload failing (e.g. not configured yet) shouldn't block
      // submitting the feedback itself.
      setError(
        err instanceof ApiRequestError
          ? `${err.message} (your feedback below will still be submitted without it)`
          : "Couldn't upload the screenshot — submitting without it.",
      );
    } finally {
      setUploading(false);
    }

    try {
      await createMutation.mutateAsync({
        type,
        subject,
        description,
        screenshotUrl,
        ...captureFeedbackContext(pathname),
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : "Something went wrong.",
      );
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center">
        <CheckCircle2 className="h-9 w-9 text-emerald-500" />
        <div>
          <p className="font-medium">
            Thank you for helping improve the Book Tracker.
          </p>
          <p className="text-sm text-muted-foreground">
            Your feedback has been received.
          </p>
        </div>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          Submit another
        </Button>
      </div>
    );
  }

  const submitting = uploading || createMutation.isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-card p-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="feedback-type">Feedback Type</Label>
        <Select
          id="feedback-type"
          value={type}
          onChange={(e) => setType(e.target.value as CreateFeedbackInput["type"])}
        >
          {FEEDBACK_TYPES.map((t) => (
            <option key={t} value={t}>
              {FEEDBACK_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feedback-subject">Subject</Label>
        <Input
          id="feedback-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Short summary"
          maxLength={200}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="feedback-description">Description</Label>
        <Textarea
          id="feedback-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="What happened, or what would you like to see?"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Screenshot (optional)</Label>
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Screenshot preview"
              className="h-32 rounded-lg border object-cover"
            />
            <button
              type="button"
              onClick={() => handleFile(undefined)}
              className="absolute -right-2 -top-2 rounded-full bg-foreground p-1 text-background"
              aria-label="Remove screenshot"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:bg-secondary">
            <ImagePlus className="h-4 w-4" />
            Add a screenshot
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={submitting || !subject.trim() || !description.trim()}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          "Submit"
        )}
      </Button>
    </form>
  );
}
