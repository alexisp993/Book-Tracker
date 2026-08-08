"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn, hitArea } from "@/lib/utils";
import { useCurrentUser } from "@/lib/queries";

// Hand-rolled dropdown (no menu primitive exists in this app's UI kit yet) —
// closes on outside click or Escape, same pattern as the existing Dialog.
export function AccountMenu() {
  const { data: me } = useCurrentUser();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          hitArea,
        )}
        aria-label="Account menu"
        aria-expanded={open}
      >
        <User className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border bg-card p-1 shadow-lg animate-[bt-menu-in_140ms_ease-out]"
          role="menu"
        >
          {me ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Signed in as <span className="font-medium">{me.name ?? me.email}</span>
            </div>
          ) : null}
          <MenuLink href="/feedback" onClick={() => setOpen(false)}>
            <MessageSquareText className="h-4 w-4" /> Feedback
          </MenuLink>
          <MenuLink href="/my-feedback" onClick={() => setOpen(false)}>
            <MessageSquareText className="h-4 w-4" /> My Feedback
          </MenuLink>
          {me?.isAdmin ? (
            <>
              <div className="my-1 border-t" />
              <MenuLink href="/admin/dashboard" onClick={() => setOpen(false)}>
                <LayoutDashboard className="h-4 w-4" /> Beta Dashboard
              </MenuLink>
              <MenuLink href="/admin/feedback" onClick={() => setOpen(false)}>
                <ShieldCheck className="h-4 w-4" /> Admin Feedback
              </MenuLink>
            </>
          ) : null}
          <div className="my-1 border-t" />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              )}
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </Link>
  );
}
