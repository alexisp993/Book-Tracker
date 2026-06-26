"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { ListParams, ListSessionsParams } from "@/lib/api";
import type { GroupBasePath } from "@/lib/api";
import type { CreateBookInput, UpdateBookInput } from "@/lib/validation";
import type {
  CreateFeedbackInput,
  CreateSessionInput,
  StopSessionInput,
  UpdateFeedbackStatusInput,
  UpdateSessionInput,
} from "@/lib/validation";
import type { AdminFeedbackListParams } from "@/lib/api";
import type { LibraryBook, Paginated } from "@/lib/types";

// Centralized query-key factories so every component matches the same keys
// for both reading and invalidating — see docs/PERFORMANCE-AUDIT.md for the
// staleTime/invalidation table this implements.
export const queryKeys = {
  books: (params: ListParams = {}) => ["books", params] as const,
  booksAll: ["books"] as const,
  groups: (base: GroupBasePath) => ["groups", base] as const,
  group: (base: GroupBasePath, id: string) => ["group", base, id] as const,
  stats: ["stats"] as const,
  sessionStats: ["sessionStats"] as const,
  sessions: (params: ListSessionsParams = {}) => ["sessions", params] as const,
  sessionsAll: ["sessions"] as const,
  activeSession: ["activeSession"] as const,
  currentUser: ["currentUser"] as const,
  myFeedback: ["feedback", "mine"] as const,
  adminFeedbackList: (params: AdminFeedbackListParams = {}) =>
    ["adminFeedback", "list", params] as const,
  adminFeedbackDetail: (id: string) => ["adminFeedback", "detail", id] as const,
  betaStats: ["betaStats"] as const,
};

// --- Books ---

export function useBooks(params: ListParams = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.books(params),
    queryFn: () => api.listBooks(params),
    staleTime: 20_000,
    enabled: options.enabled,
  });
}

function useInvalidateBooks() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.booksAll });
    qc.invalidateQueries({ queryKey: queryKeys.stats });
  };
}

export function useCreateBook() {
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: (input: CreateBookInput) => api.createBook(input),
    onSuccess: invalidate,
  });
}

// Entry-level fields that map 1:1 onto LibraryBook with no transformation,
// safe to patch into the cache immediately. Book-level fields (title,
// authors, etc.) need server-side parsing (e.g. comma-split authors) and are
// left to the post-mutation refetch — the edit form's save button already
// has its own pending state, so that round-trip isn't felt as "slow" the way
// a single-tap status change (Start reading) is.
function applyOptimisticEntryFields(
  book: LibraryBook,
  input: UpdateBookInput,
): LibraryBook {
  return {
    ...book,
    ...(input.status !== undefined && { status: input.status }),
    ...(input.rating !== undefined && { rating: input.rating }),
    ...(input.favorite !== undefined && { favorite: input.favorite }),
    ...(input.currentPage !== undefined && { currentPage: input.currentPage }),
    ...(input.startDate !== undefined && {
      startDate: input.startDate ? new Date(input.startDate).toISOString() : null,
    }),
    ...(input.finishDate !== undefined && {
      finishDate: input.finishDate ? new Date(input.finishDate).toISOString() : null,
    }),
  };
}

export function useUpdateBook() {
  const qc = useQueryClient();
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBookInput }) =>
      api.updateBook(id, input),
    onMutate: async ({ id, input }) => {
      const previous = qc.getQueriesData<Paginated<LibraryBook>>({
        queryKey: queryKeys.booksAll,
      });
      qc.setQueriesData<Paginated<LibraryBook>>(
        { queryKey: queryKeys.booksAll },
        (old) =>
          old && {
            ...old,
            items: old.items.map((b) =>
              b.id === id ? applyOptimisticEntryFields(b, input) : b,
            ),
          },
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      context?.previous?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: () => {
      invalidate();
      // Shelf/collection chips live in the book form; a save may have
      // changed membership, so refresh both group lists rather than trying
      // to track which one (cheap — group lists are small).
      qc.invalidateQueries({ queryKey: ["groups"] });
      qc.invalidateQueries({ queryKey: ["group"] });
    },
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: (id: string) => api.deleteBook(id),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useEnrichBooks() {
  const invalidate = useInvalidateBooks();
  return useMutation({
    mutationFn: () => api.enrichBooks(),
    onSuccess: invalidate,
  });
}

// --- Shelves & Collections (groups) ---

export function useGroups(base: GroupBasePath) {
  return useQuery({
    queryKey: queryKeys.groups(base),
    queryFn: () => api.listGroups(base),
    staleTime: 60_000,
  });
}

export function useGroup(base: GroupBasePath, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.group(base, id ?? ""),
    queryFn: () => api.getGroup(base, id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useCreateGroup(base: GroupBasePath) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; description?: string }) =>
      api.createGroup(base, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups(base) }),
  });
}

export function useUpdateGroup(base: GroupBasePath) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { name?: string; description?: string };
    }) => api.updateGroup(base, id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups(base) });
      qc.invalidateQueries({ queryKey: queryKeys.group(base, vars.id) });
    },
  });
}

export function useDeleteGroup(base: GroupBasePath) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGroup(base, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.groups(base) }),
  });
}

// --- Stats ---

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.getStats(),
    staleTime: 30_000,
  });
}

export function useSessionStats() {
  return useQuery({
    queryKey: queryKeys.sessionStats,
    queryFn: () => api.getSessionStats(),
    staleTime: 30_000,
  });
}

// --- Reading sessions ---

export function useSessions(params: ListSessionsParams = {}) {
  return useQuery({
    queryKey: queryKeys.sessions(params),
    queryFn: () => api.listSessions(params),
    staleTime: 15_000,
  });
}

function useInvalidateSessions() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: queryKeys.sessionsAll });
    qc.invalidateQueries({ queryKey: queryKeys.sessionStats });
  };
}

export function useCreateSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (input: CreateSessionInput) => api.createSession(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSessionInput }) =>
      api.updateSession(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSession() {
  const invalidate = useInvalidateSessions();
  return useMutation({
    mutationFn: (id: string) => api.deleteSession(id),
    onSuccess: invalidate,
  });
}

// --- Active (live timer) session ---
// staleTime: 0 — this is live state (is a timer running right now); never
// let a stale cache hide a session another tab/device just started/stopped.
// The 1-second elapsed-time tick stays plain local state in ReadingTimer —
// it re-renders a clock from data already in memory, it does NOT refetch.

export function useActiveSession() {
  return useQuery({
    queryKey: queryKeys.activeSession,
    queryFn: () => api.getActiveSession(),
    staleTime: 0,
  });
}

export function useStartSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userBookId: string) => api.startSession(userBookId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activeSession });
      // Starting a session may auto-promote WANT_TO_READ/ON_HOLD -> CURRENTLY_READING.
      qc.invalidateQueries({ queryKey: queryKeys.booksAll });
    },
  });
}

export function useStopSession() {
  const qc = useQueryClient();
  const invalidateSessions = useInvalidateSessions();
  return useMutation({
    mutationFn: (input: StopSessionInput) => api.stopSession(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activeSession });
      invalidateSessions();
      // endPage may have updated the book's currentPage.
      qc.invalidateQueries({ queryKey: queryKeys.booksAll });
    },
  });
}

// --- Current user ---
// staleTime: a few minutes — admin status rarely changes mid-session, and
// this is fetched by AppShell on every page, so it should not be a
// noisy/duplicate-fetch source itself.

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.currentUser,
    queryFn: () => api.getCurrentUserInfo(),
    staleTime: 5 * 60_000,
  });
}

// --- Feedback (own submissions) ---

export function useMyFeedback() {
  return useQuery({
    queryKey: queryKeys.myFeedback,
    queryFn: () => api.listMyFeedback(),
    staleTime: 15_000,
  });
}

export function useCreateFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFeedbackInput) => api.submitFeedback(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myFeedback });
      // Affects the admin list/dashboard too, if an admin happens to have it open.
      qc.invalidateQueries({ queryKey: ["adminFeedback"] });
      qc.invalidateQueries({ queryKey: queryKeys.betaStats });
    },
  });
}

// --- Admin: feedback management ---

export function useAdminFeedbackList(params: AdminFeedbackListParams = {}) {
  return useQuery({
    queryKey: queryKeys.adminFeedbackList(params),
    queryFn: () => api.adminListFeedback(params),
    staleTime: 15_000,
  });
}

export function useAdminFeedbackDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminFeedbackDetail(id ?? ""),
    queryFn: () => api.adminGetFeedback(id!),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateFeedbackStatusInput;
    }) => api.adminUpdateFeedback(id, input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["adminFeedback", "list"] });
      qc.invalidateQueries({ queryKey: queryKeys.adminFeedbackDetail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.betaStats });
    },
  });
}

// --- Admin: beta dashboard ---

export function useBetaStats() {
  return useQuery({
    queryKey: queryKeys.betaStats,
    queryFn: () => api.getBetaStats(),
    staleTime: 30_000,
  });
}
