"use client";

import * as React from "react";
import { GripVertical, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SECTION_LABELS } from "@/lib/homeConfig";
import { useHomeConfig, useUpdateHomeConfig } from "@/lib/queries";
import type { HomeSection } from "@/lib/homeConfig";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HomeCustomizer({ open, onClose }: Props) {
  const { data: savedConfig } = useHomeConfig();
  const updateConfig = useUpdateHomeConfig();

  const [sections, setSections] = React.useState<HomeSection[]>([]);
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync local state when dialog opens or config loads
  React.useEffect(() => {
    if (open && savedConfig) {
      setSections([...savedConfig].sort((a, b) => a.order - b.order));
      setError(null);
    }
  }, [open, savedConfig]);

  function toggleVisible(key: string) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, visible: !s.visible } : s)),
    );
  }

  function handleDragStart(e: React.DragEvent, key: string) {
    setDragging(key);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, key: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(key);
  }

  function handleDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    if (!dragging || dragging === targetKey) {
      setDragging(null);
      setDragOver(null);
      return;
    }
    setSections((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((s) => s.key === dragging);
      const toIdx = next.findIndex((s) => s.key === targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next.map((s, i) => ({ ...s, order: i }));
    });
    setDragging(null);
    setDragOver(null);
  }

  function handleDragEnd() {
    setDragging(null);
    setDragOver(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const ordered = sections.map((s, i) => ({ ...s, order: i }));
      await updateConfig.mutateAsync(ordered);
      onClose();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Customize Home">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Drag to reorder sections or toggle them on/off.
        </p>

        <div className="space-y-1.5">
          {sections.map((section) => (
            <div
              key={section.key}
              draggable
              onDragStart={(e) => handleDragStart(e, section.key)}
              onDragOver={(e) => handleDragOver(e, section.key)}
              onDrop={(e) => handleDrop(e, section.key)}
              onDragEnd={handleDragEnd}
              className={[
                "flex cursor-grab items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition-colors active:cursor-grabbing",
                dragOver === section.key && dragging !== section.key
                  ? "border-primary bg-primary/5"
                  : "",
                dragging === section.key ? "opacity-50" : "",
              ].join(" ")}
            >
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              <span
                className={`flex-1 text-sm font-medium ${section.visible ? "" : "text-muted-foreground line-through"}`}
              >
                {SECTION_LABELS[section.key]}
              </span>
              <button
                type="button"
                onClick={() => toggleVisible(section.key)}
                className={[
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                  section.visible
                    ? "bg-primary"
                    : "bg-muted-foreground/25",
                ].join(" ")}
                role="switch"
                aria-checked={section.visible}
                aria-label={`Toggle ${SECTION_LABELS[section.key]}`}
              >
                <span
                  className={[
                    "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
                    section.visible ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>
          ))}
        </div>

        {error ? (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
