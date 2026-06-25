# API Contracts — Book Tracker

_Owner: Agent 3 (Backend), reviewed by Agent 4 (QA). Base path: `/api`._

Conventions:
- All responses are JSON. Errors use `{ "error": string, "details"?: unknown }`.
- All endpoints operate on the current user (single local user this phase).
- Validation via Zod (`lib/validation.ts`). Validation failures return **422** with
  `details` = flattened Zod errors; malformed query params return **400**.

---

## Books

### `GET /api/books`
List the current user's library.

**Query params** (all optional):
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `q` | string | — | matches title, subtitle, author, ISBN-10/13, publisher |
| `status` | enum | — | `WANT_TO_READ` \| `CURRENTLY_READING` \| `READ` \| `DID_NOT_FINISH` \| `ON_HOLD` |
| `favorite` | `true`\|`false` | — | filter favorites |
| `sort` | enum | `createdAt` | `createdAt` \| `title` \| `rating` \| `publishedDate` |
| `order` | `asc`\|`desc` | `desc` | |
| `page` | int ≥1 | 1 | |
| `pageSize` | int 1–100 | 24 | |

**200** →
```json
{
  "items": [ /* LibraryBook[] */ ],
  "page": 1, "pageSize": 24, "total": 3, "totalPages": 1
}
```

### `POST /api/books`
Create a book and add it to the library.

**Body** (`CreateBookInput`): `title` (required), `authors` (comma-separated string),
`subtitle`, `description`, `publisher`, `publishedDate`, `isbn10`, `isbn13`, `language`,
`pageCount`, `coverUrl`, `status`, `rating` (1–5), `favorite`, `currentPage`,
`startDate`, `finishDate`.

- **201** → the created `LibraryBook`.
- **409** → ISBN-13 already in the user's library.
- **422** → validation failed.

### `GET /api/books/:id`
`id` = `UserBook` id. **200** → `LibraryBook`. **404** if not found / not owned.

### `PATCH /api/books/:id`
Partial update of book metadata and/or reading entry (`UpdateBookInput` — all fields optional,
`title` cannot be emptied). Replacing `authors` replaces the full ordered author list.
- **200** → updated `LibraryBook`.
- **404** not owned · **409** ISBN-13 conflict · **422** validation failed.

### `DELETE /api/books/:id`
Remove the library entry (the shared `Book` row is preserved). **204** on success, **404** if not owned.

---

## Metadata

### `GET /api/metadata/isbn/:isbn`
Resolve book metadata for a scanned or typed ISBN (ISBN-10 or ISBN-13; hyphens/spaces ignored).
Tries **Open Library** first, falls back to **Google Books**.

- **200** → `BookMetadata`:
  ```ts
  {
    title: string; subtitle?: string; authors: string[]; description?: string;
    publisher?: string; publishedDate?: string; isbn10?: string; isbn13?: string;
    language?: string; pageCount?: number; coverUrl?: string; categories?: string[];
    source: "OPEN_LIBRARY" | "GOOGLE_BOOKS";
  }
  ```
- **400** → not a valid ISBN.
- **404** → no provider had a record (caller can still add manually).

Implemented in `lib/metadata.ts` (providers + normalization) and `lib/isbn.ts` (validation,
ISBN-10→13). Consumed by the in-app barcode scanner (`components/BarcodeScanner.tsx`).

---

## `LibraryBook` shape
```ts
{
  id: string;            // UserBook id
  bookId: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  isbn10: string | null;
  isbn13: string | null;
  language: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  status: ReadingStatus;
  rating: number | null;
  favorite: boolean;
  currentPage: number;
  startDate: string | null;   // ISO
  finishDate: string | null;  // ISO
  createdAt: string;          // ISO
  updatedAt: string;          // ISO
}
```

---

## Planned endpoints (designed, not yet built)
| Endpoint | Purpose | Phase |
|----------|---------|-------|
| `GET/POST /api/shelves`, `/api/shelves/:id/books` | Shelves CRUD + membership | 4 |
| `GET/POST /api/collections` | Collections CRUD | 4 |
| `GET/POST /api/books/:id/reviews`, `/notes` | Reviews & notes | 4 |
| `GET/POST /api/books/:id/sessions` | Reading sessions | 5 |
| `GET /api/stats` | Aggregated analytics | 5 |
| `GET/POST /api/goals` | Reading goals/challenges | 5 |
| `GET /api/ai/recommendations`, `/api/ai/insights` | AI layer (stubbed) | 5 |
| `POST /api/import`, `GET /api/export` | Goodreads/StoryGraph/CSV | 6 |
