# ADR-0003 — AI layer designed and stubbed, not yet wired

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Agent 1, confirmed with product owner.

## Context
AI recommendations and insights are core to the product's differentiation but require an LLM
API key and meaningful reading history to be useful. We want to build and test the UI and API
surfaces now without a live key or cost.

## Decision
Define **stable typed interfaces** for the AI layer (`lib/ai/types.ts`) and provide
**deterministic stub implementations** (`lib/ai/recommendations.ts`, `lib/ai/insights.ts`)
that compute simple real metrics / placeholders from the database. Callers depend only on the
interface (`BookRecommendation[]`, `ReadingInsight[]`).

## Decision detail — live implementation (later)
Wire the **Anthropic API**: default model `claude-opus-4-8` for quality, a cheaper model
(e.g. a Haiku-class model) for bulk/background passes. The implementation will summarize the
user's library into a prompt, request **structured JSON** matching the existing interfaces, and
validate with Zod before returning. No caller changes required.

## Consequences
- ✅ UI/API for AI features can be built and demoed now, key-free and cost-free.
- ✅ Going live is additive — swap the function body, keep the signature.
- ➖ Recommendations are placeholders until wired.
