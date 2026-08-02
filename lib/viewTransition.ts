import { flushSync } from "react-dom";

// Thin wrapper around the native View Transitions API (no library — matches
// the project's dependency-light constraint). Feature-detected: on browsers
// without support (Firefox, older Safari) this just runs `update()` directly,
// so the calendar's month/year navigation works exactly as it always has —
// the transition is a progressive enhancement, never a requirement.
//
// `direction` drives which way the outgoing/incoming month or year label
// slides (see the ::view-transition-old/new rules in globals.css). It's
// written to a data-attribute on <html> immediately before starting the
// transition, since view-transition pseudo-elements can only be targeted
// globally, not scoped to a component.
export function withCalendarTransition(
  direction: "next" | "prev" | null,
  update: () => void,
) {
  if (typeof document === "undefined" || !document.startViewTransition) {
    update();
    return;
  }
  document.documentElement.dataset.calendarDirection = direction ?? "";
  const transition = document.startViewTransition(() => flushSync(update));
  transition.finished.finally(() => {
    delete document.documentElement.dataset.calendarDirection;
  });
}
