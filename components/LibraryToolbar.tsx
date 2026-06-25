"use client";

import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import {
  BOOK_SORTS,
  READING_STATUSES,
  SORT_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";

export interface LibraryFilters {
  q: string;
  status: string; // "" = all
  sort: string;
  order: "asc" | "desc";
}

export function LibraryToolbar({
  filters,
  onChange,
}: {
  filters: LibraryFilters;
  onChange: (next: LibraryFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          placeholder="Search title, author, ISBN, publisher…"
          className="pl-9"
          aria-label="Search library"
        />
      </div>

      <Select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="sm:w-44"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {READING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>

      <Select
        value={`${filters.sort}:${filters.order}`}
        onChange={(e) => {
          const [sort, order] = e.target.value.split(":");
          onChange({ ...filters, sort, order: order as "asc" | "desc" });
        }}
        className="sm:w-48"
        aria-label="Sort books"
      >
        {BOOK_SORTS.flatMap((s) => {
          const orders: ("asc" | "desc")[] =
            s === "title" ? ["asc", "desc"] : ["desc", "asc"];
          return orders.map((o) => (
            <option key={`${s}:${o}`} value={`${s}:${o}`}>
              {SORT_LABELS[s]} ({o === "asc" ? "↑" : "↓"})
            </option>
          ));
        })}
      </Select>
    </div>
  );
}
