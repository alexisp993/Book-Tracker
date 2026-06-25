// Stable contracts for the AI layer. Implementations are stubbed this phase;
// wiring a live model later must not change these shapes.

export interface BookRecommendation {
  title: string;
  author: string;
  reason: string;
  // 0..1 confidence the model assigns to this suggestion
  confidence: number;
}

export interface ReadingInsight {
  // short machine key, e.g. "favorite_genre", "reading_pace"
  key: string;
  headline: string;
  detail: string;
}

export interface RecommendationContext {
  userId: string;
}

export interface InsightContext {
  userId: string;
}
