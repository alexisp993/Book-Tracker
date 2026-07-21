"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { BackHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ProfileBackupView() {
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "book-tracker-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <BackHeader href="/profile" backLabel="Back to Profile" title="Backup & Sync" />

      <Card>
        <p className="text-sm text-muted-foreground">
          Download a copy of your library, reading sessions, notes, and goals as a JSON file —
          a personal backup you can keep for your own records.
        </p>
        <Button className="mt-4" onClick={handleDownload} disabled={downloading}>
          <Download className="h-4 w-4" />
          {downloading ? "Preparing…" : "Download My Data"}
        </Button>
        {error ? (
          <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
