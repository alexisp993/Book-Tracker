"use client";

import * as React from "react";
import {
  Camera,
  CheckCircle2,
  Keyboard,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { normalizeIsbn, isValidIsbn } from "@/lib/isbn";
import { ApiRequestError, createBook, lookupIsbn } from "@/lib/api";
import type { BookMetadata } from "@/lib/metadata";
import type { CreateBookInput } from "@/lib/validation";

type Tab = "camera" | "upload" | "manual";
type Phase = "idle" | "scanning" | "looking-up" | "error";

interface ScannerControls {
  stop: () => void;
}

// A line in the "added this session" feed.
interface ScanResult {
  isbn: string;
  title: string;
  outcome: "added" | "duplicate" | "not-found" | "error";
}

function metadataToInput(m: BookMetadata): CreateBookInput {
  return {
    title: m.title,
    subtitle: m.subtitle,
    authors: m.authors.join(", ") || undefined,
    description: m.description,
    publisher: m.publisher,
    publishedDate: m.publishedDate,
    isbn10: m.isbn10,
    isbn13: m.isbn13,
    language: m.language,
    pageCount: m.pageCount,
    coverUrl: m.coverUrl,
    status: "WANT_TO_READ",
    favorite: false,
  };
}

export function BarcodeScanner({
  open,
  onClose,
  onResolved,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  // Review mode: hand metadata to the parent to prefill the add form.
  onResolved: (metadata: BookMetadata) => void;
  // Auto-add mode: a book was added directly; refresh the library list.
  onAdded: () => void;
}) {
  const [tab, setTab] = React.useState<Tab>("camera");
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [manualIsbn, setManualIsbn] = React.useState("");
  const [autoAdd, setAutoAdd] = React.useState(true);
  const [results, setResults] = React.useState<ScanResult[]>([]);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<ScannerControls | null>(null);
  // ISBNs already handled this session (dedupes repeated frames of the same barcode).
  const processedRef = React.useRef<Set<string>>(new Set());

  // Keep the latest values available to the long-lived camera callback without
  // restarting the camera when they change.
  const autoAddRef = React.useRef(autoAdd);
  const onResolvedRef = React.useRef(onResolved);
  const onAddedRef = React.useRef(onAdded);
  React.useEffect(() => {
    autoAddRef.current = autoAdd;
    onResolvedRef.current = onResolved;
    onAddedRef.current = onAdded;
  });

  const stopCamera = React.useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
  }, []);

  // Core handler: validate an ISBN, then either auto-add or hand off for review.
  const handleIsbn = React.useCallback(
    async (rawIsbn: string) => {
      const isbn = normalizeIsbn(rawIsbn);
      if (!isValidIsbn(isbn)) {
        setPhase("error");
        setMessage("That doesn't look like a valid ISBN. Try again.");
        return;
      }

      if (!autoAddRef.current) {
        // Review mode — stop scanning and let the parent open the prefilled form.
        stopCamera();
        setPhase("looking-up");
        setMessage(null);
        try {
          const metadata = await lookupIsbn(isbn);
          onResolvedRef.current(metadata);
        } catch (err) {
          setPhase("error");
          setMessage(
            err instanceof ApiRequestError
              ? err.message
              : "Lookup failed. Check your connection and try again.",
          );
        }
        return;
      }

      // Auto-add mode — dedupe, look up, create, keep scanning.
      if (processedRef.current.has(isbn)) return;
      processedRef.current.add(isbn);
      setPhase("looking-up");
      setMessage(null);
      try {
        const metadata = await lookupIsbn(isbn);
        try {
          await createBook(metadataToInput(metadata));
          setResults((r) => [
            { isbn, title: metadata.title, outcome: "added" },
            ...r,
          ]);
          onAddedRef.current();
        } catch (err) {
          if (err instanceof ApiRequestError && err.status === 409) {
            setResults((r) => [
              { isbn, title: metadata.title, outcome: "duplicate" },
              ...r,
            ]);
          } else {
            throw err;
          }
        }
      } catch (err) {
        // Allow a retry of this ISBN later.
        processedRef.current.delete(isbn);
        const notFound = err instanceof ApiRequestError && err.status === 404;
        setResults((r) => [
          {
            isbn,
            title: notFound ? `ISBN ${isbn}` : `ISBN ${isbn}`,
            outcome: notFound ? "not-found" : "error",
          },
          ...r,
        ]);
      } finally {
        setPhase(
          autoAddRef.current && tabRef.current === "camera"
            ? "scanning"
            : "idle",
        );
        setManualIsbn("");
      }
    },
    [stopCamera],
  );

  // tab in a ref so the camera callback reads the current tab.
  const tabRef = React.useRef<Tab>(tab);
  React.useEffect(() => {
    tabRef.current = tab;
  }, [tab]);

  // Camera lifecycle: continuous decoding while the camera tab is open.
  React.useEffect(() => {
    if (!open || tab !== "camera") return;
    let cancelled = false;
    setPhase("scanning");
    setMessage(null);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result) void handleIsbn(result.getText());
          },
        );
        controlsRef.current = controls as ScannerControls;
      } catch (err) {
        if (cancelled) return;
        setPhase("error");
        const name = (err as { name?: string })?.name;
        setMessage(
          name === "NotAllowedError"
            ? "Camera permission denied. Use image upload or manual entry instead."
            : name === "NotFoundError"
              ? "No camera found. Use image upload or manual entry instead."
              : "Couldn't start the camera. Try upload or manual entry. (Camera needs HTTPS or localhost.)",
        );
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, tab, handleIsbn, stopCamera]);

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      stopCamera();
      setTab("camera");
      setPhase("idle");
      setMessage(null);
      setManualIsbn("");
      setResults([]);
      processedRef.current = new Set();
    }
  }, [open, stopCamera]);

  async function handleUpload(file: File) {
    setPhase("looking-up");
    setMessage(null);
    const url = URL.createObjectURL(file);
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(url);
      await handleIsbn(result.getText());
    } catch {
      setPhase("error");
      setMessage(
        "No barcode detected in that image. Try a clearer photo or enter the ISBN manually.",
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "camera", label: "Camera", icon: <Camera className="h-4 w-4" /> },
    { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { id: "manual", label: "Manual", icon: <Keyboard className="h-4 w-4" /> },
  ];

  const busy = phase === "looking-up";
  const addedCount = results.filter((r) => r.outcome === "added").length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Scan a book"
      description={
        autoAdd
          ? "Scan a barcode and it's added straight to your library — keep scanning to add more."
          : "Scan, upload, or type an ISBN; review the details before saving."
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                stopCamera();
                setPhase("idle");
                setMessage(null);
                setTab(t.id);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between rounded-lg border px-3 py-2.5">
          <span className="text-sm">
            <span className="font-medium">Add automatically</span>
            <span className="block text-xs text-muted-foreground">
              {autoAdd
                ? "Adds as “Want to Read” without the form"
                : "Opens the form so you can edit first"}
            </span>
          </span>
          <input
            type="checkbox"
            checked={autoAdd}
            onChange={(e) => setAutoAdd(e.target.checked)}
            className="h-5 w-5 rounded border-input"
          />
        </label>

        {tab === "camera" && (
          <div className="space-y-2">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                muted
                playsInline
              />
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/70" />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {autoAdd
                ? "Point at each barcode — books are added as they're recognized."
                : "Point your camera at the barcode on the back cover."}
            </p>
          </div>
        )}

        {tab === "upload" && (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center hover:bg-accent">
            <Upload className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-medium">Choose a barcode photo</span>
            <span className="text-xs text-muted-foreground">
              PNG or JPG of the ISBN barcode
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {tab === "manual" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleIsbn(manualIsbn);
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="manual-isbn">ISBN-10 or ISBN-13</Label>
              <Input
                id="manual-isbn"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                placeholder="9780547928227"
                inputMode="numeric"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={busy || manualIsbn.trim().length === 0}
            >
              {autoAdd ? "Add to library" : "Look up"}
            </Button>
          </form>
        )}

        {busy && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Looking up book…
          </div>
        )}

        {message && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        )}

        {results.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Added this session ({addedCount})
            </p>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {results.map((r, i) => (
                <li
                  key={`${r.isbn}-${i}`}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm"
                >
                  {r.outcome === "added" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="line-clamp-1 flex-1">{r.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.outcome === "added"
                      ? "Added"
                      : r.outcome === "duplicate"
                        ? "Already in library"
                        : r.outcome === "not-found"
                          ? "Not found"
                          : "Error"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {results.length > 0 && (
          <Button variant="outline" className="w-full" onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </Dialog>
  );
}
