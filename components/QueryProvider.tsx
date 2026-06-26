"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // One QueryClient per browser session (not per render) — React state, not
  // module scope, so each user/tab gets its own cache without leaking across
  // server-rendered requests.
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Per-query staleTime is set at each useQuery call site; this is
            // just a safe fallback for anything that forgets to set one.
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
