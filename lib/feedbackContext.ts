// Auto-captured feedback context — never user-entered. Call only client-side.
export function captureFeedbackContext(page: string) {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile =
    typeof window !== "undefined"
      ? /Mobi|Android/i.test(ua) || window.innerWidth < 768
      : false;

  return {
    page,
    browser: ua.slice(0, 255),
    deviceType: isMobile ? "mobile" : "desktop",
    appVersion: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
  };
}
