# Product Requirements Document — Book Tracker

_Owner: Agent 1 (Product Manager & Architect). Living document — updated each phase._

## 1. Vision

A next-generation **personal** library and reading tracker that fuses the best of
BookBuddy (clean library management + barcode scanning), Goodreads (social-grade ratings,
reviews, shelves), and StoryGraph (deep reading analytics and mood/genre insight), enhanced
with AI recommendations and insights. Modern, fast, mobile-first, and **unlimited** — no caps
on books, shelves, collections, sessions, notes, or reviews.

## 2. Target user

A dedicated reader who wants to catalog what they read, track progress and habits, and get
meaningful insight and recommendations — without the bloat, ads, or limits of existing apps.
Initially single-user (the owner of the install); architected for multi-user later.

## 3. Goals & non-goals

**Goals**
- Effortless capture of books (manual now; barcode + metadata lookup next).
- A reading lifecycle: Want to Read → Currently Reading → Read / DNF / On Hold.
- Rich organization: unlimited shelves and collections, ratings, reviews, private notes.
- StoryGraph-level analytics and reading challenges.
- AI recommendations and insights from the user's own history.

**Non-goals (for now)**
- A social network / following / feeds.
- Selling books or affiliate commerce.
- Mobile native apps (we ship a PWA instead).

## 4. Feature scope by status

| Feature | Phase | Status |
|---------|-------|--------|
| Core library CRUD (add/edit/delete/list) | 3 | ✅ Built (foundation) |
| Search / filter / sort / pagination | 3 | ✅ Built (foundation) |
| Reading status lifecycle | 3 | ✅ Built (foundation) |
| Ratings, favorites, basic progress | 4 | ◑ Partial (rating/favorite/current page on entry) |
| Barcode scanning (camera/upload/manual ISBN) | 3 | ✅ Built |
| Metadata lookup (Open Library, Google Books) | 3 | ✅ Built |
| Reviews & notes | 4 | ☐ Designed (schema ready) |
| Shelves & collections | 4 | ☐ Designed (schema ready) |
| Reading sessions | 5 | ☐ Designed (schema ready) |
| Analytics dashboard | 5 | ☐ Designed |
| Reading goals / challenges | 5 | ☐ Designed (schema ready) |
| AI recommendations & insights | 5 | ◑ Stubbed (clean interfaces) |
| Import / export (Goodreads, StoryGraph, CSV) | 6 | ☐ Designed |
| Auth (email + Google) | 2 | ☐ Deferred (single-user now) |
| PWA / offline | 6 | ☐ Designed |

## 5. Core user stories (with acceptance criteria)

### US-1 — Add a book (foundation)
_As a reader, I want to add a book to my library so I can track it._
- **AC1:** I can open an "Add book" form and enter at least a title.
- **AC2:** Title is required; submitting without it is blocked with a clear message.
- **AC3:** On success the book appears in the grid immediately and persists across refresh.
- **AC4:** Adding a book that shares an ISBN-13 already in my library is rejected (409).

### US-2 — See my library (foundation)
_As a reader, I want a visual grid of my books with status at a glance._
- **AC1:** Each card shows cover (or placeholder), title, author(s), status badge, and rating if set.
- **AC2:** Currently-reading books show a progress bar when page counts are known.
- **AC3:** The grid is responsive (2 cols on mobile → 6 on wide screens).

### US-3 — Search, filter, sort (foundation)
_As a reader, I want to find books quickly._
- **AC1:** Free-text search matches title, subtitle, author, ISBN, or publisher.
- **AC2:** I can filter by reading status.
- **AC3:** I can sort by date added, title, rating, or publication date (asc/desc).
- **AC4:** Results paginate; controls disable appropriately at the ends.

### US-4 — Edit / remove a book (foundation)
_As a reader, I want to update details or remove a book._
- **AC1:** Editing updates both book metadata and my reading entry.
- **AC2:** Removing prompts for confirmation and deletes my entry.

### US-5 — Scan a barcode ✅
_As a reader, I want to scan an ISBN to auto-fill metadata._
- **AC1:** ✅ Camera scan, image upload, and manual ISBN entry all resolve to the same lookup.
- **AC2:** ✅ Detected ISBN fetches title, authors, publisher, dates, cover, pages, etc. from a
  free provider (Open Library), falling back to Google Books on miss.
- **AC3:** ✅ Resolved metadata prefills the add form; the user reviews and saves.
- **AC4:** ✅ Invalid ISBN → clear error; unknown ISBN → user can still add manually.

## 6. Quality bar
- Mobile-first, touch-friendly, accessible (labelled controls, keyboard-operable dialogs).
- All API input validated (Zod); consistent JSON error shape.
- Designed for 100k+ books per user (indexes + pagination).
- Security reviewed against OWASP Top 10 each phase (see QA-REPORTS).
