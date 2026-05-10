// ─── Interfaces matching Azure Pronunciation Assessment output ───────────────

export interface AzurePhoneme {
  phoneme: string;          // IPA symbol (e.g. "θ", "ɹ", "æ")
  accuracy_score: number;   // 0–100
  // Optional: populated when Azure returns nBestPhonemes in full-detail mode
  nBestPhonemes?: Array<{ phoneme: string; score: number }>;
}

export interface AzureWord {
  word: string;
  accuracy_score: number;
  error_type: "None" | "Mispronunciation" | "Omission" | "Insertion" | "Substitution" | string;
  phonemes: AzurePhoneme[];
}

export interface AzureRawResponse {
  words: AzureWord[];
  pronunciation_score?: number;
  accuracy_score?: number;
  fluency_score?: number;
  completeness_score?: number;
}

// ─── Stored error shape from Supabase phoneme_errors table ───────────────────

export interface StoredPhonemeError {
  expected_phoneme: string;
  actual_phoneme: string;   // empty string or "~<ipa>" for mispronunciations
  accuracy_score: number;
  word: string;
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface PhonemeErrorEntry {
  symbol: string;           // IPA, e.g. "/θ/"
  avgScore: number;
  count: number;
  mispronunciationRate: number; // 0–1
  likelySub?: string;       // e.g. "/l/" — what it was substituted with
  exampleWords: string[];
}

export interface SortedErrorProfile {
  phonemes: PhonemeErrorEntry[];  // ascending avgScore, worst first
  totalSessions: number;
  totalPhonemeOccurrences: number;
  overallAccuracy: number;
}

export interface FocusAreaCard {
  phonemeSymbol: string;      // e.g. "/θ/"
  phoneticCategory: string;   // e.g. "Dental Fricative"
  linguisticCause: string;    // anatomical + L1 interference explanation
  avgScore: number;
  substitution?: string;      // e.g. "/ɹ/ → /l/"
}

// ─── IPA normalisation (Azure sometimes returns Arpabet or abbreviated forms) ─

const IPA_NORMALIZE: Record<string, string> = {
  r: "ɹ",
  g: "ɡ",
  ch: "tʃ",
  jh: "dʒ",
  sh: "ʃ",
  zh: "ʒ",
  th: "θ",
  dh: "ð",
  ng: "ŋ",
};

function norm(symbol: string): string {
  const trimmed = symbol.trim();
  return IPA_NORMALIZE[trimmed.toLowerCase()] ?? trimmed;
}

// ─── Step 1A: Aggregate from live Azure API responses ─────────────────────────

export function aggregateAssessmentErrors(
  responses: AzureRawResponse[]
): SortedErrorProfile {
  const accum: Record<
    string,
    {
      scores: number[];
      mispronouncedCount: number;
      subCandidates: string[];
      exampleWords: Set<string>;
    }
  > = {};

  let overallSum = 0;
  let overallCount = 0;
  let totalPhonemeOccurrences = 0;

  for (const response of responses) {
    if (response.pronunciation_score != null) {
      overallSum += response.pronunciation_score;
      overallCount++;
    }

    for (const word of response.words ?? []) {
      const wordIsMispronounced =
        word.error_type === "Mispronunciation" ||
        word.error_type === "Substitution";

      for (const ph of word.phonemes ?? []) {
        const symbol = norm(ph.phoneme);
        if (!symbol) continue;
        totalPhonemeOccurrences++;

        if (!accum[symbol]) {
          accum[symbol] = {
            scores: [],
            mispronouncedCount: 0,
            subCandidates: [],
            exampleWords: new Set(),
          };
        }

        const a = accum[symbol];
        a.scores.push(ph.accuracy_score);

        if (wordIsMispronounced && ph.accuracy_score < 70) {
          a.mispronouncedCount++;
          a.exampleWords.add(word.word.toLowerCase());
        }

        // If Azure returned nBestPhonemes (full-detail mode), extract actual produced phoneme
        if (ph.nBestPhonemes && ph.nBestPhonemes.length > 0 && ph.accuracy_score < 60) {
          const actual = ph.nBestPhonemes[0].phoneme;
          if (actual && norm(actual) !== symbol) {
            a.subCandidates.push(norm(actual));
          }
        }
      }
    }
  }

  const entries = buildEntries(accum, responses.length);

  return {
    phonemes: entries,
    totalSessions: responses.length,
    totalPhonemeOccurrences,
    overallAccuracy:
      overallCount > 0
        ? Math.round((overallSum / overallCount) * 10) / 10
        : 0,
  };
}

// ─── Step 1B: Aggregate from Supabase phoneme_errors rows ────────────────────
// Used by the dashboard where we pull historical stored errors rather than
// replaying full Azure responses.

export function aggregateFromSupabaseErrors(
  errors: StoredPhonemeError[]
): SortedErrorProfile {
  const accum: Record<
    string,
    {
      scores: number[];
      mispronouncedCount: number;
      subCandidates: string[];
      exampleWords: Set<string>;
    }
  > = {};

  for (const err of errors) {
    const symbol = norm(err.expected_phoneme);
    if (!symbol) continue;

    if (!accum[symbol]) {
      accum[symbol] = {
        scores: [],
        mispronouncedCount: 0,
        subCandidates: [],
        exampleWords: new Set(),
      };
    }

    const a = accum[symbol];
    a.scores.push(err.accuracy_score);
    a.mispronouncedCount++;
    if (err.word) a.exampleWords.add(err.word.toLowerCase());

    // actual_phoneme stored as "~<ipa>" for substitutions
    if (err.actual_phoneme?.startsWith("~")) {
      const actual = norm(err.actual_phoneme.slice(1));
      if (actual && actual !== symbol) {
        a.subCandidates.push(actual);
      }
    }
  }

  const entries = buildEntries(accum, 1);

  return {
    phonemes: entries,
    totalSessions: 1,
    totalPhonemeOccurrences: errors.length,
    overallAccuracy:
      errors.length > 0
        ? Math.round(
            (errors.reduce((s, e) => s + e.accuracy_score, 0) / errors.length) * 10
          ) / 10
        : 0,
  };
}

// ─── Shared: turn accumulator map into sorted PhonemeErrorEntry[] ─────────────

function buildEntries(
  accum: Record<
    string,
    {
      scores: number[];
      mispronouncedCount: number;
      subCandidates: string[];
      exampleWords: Set<string>;
    }
  >,
  _sessions: number
): PhonemeErrorEntry[] {
  return Object.entries(accum)
    .filter(([, a]) => a.scores.length >= 1)
    .map(([symbol, a]) => {
      const avgScore =
        Math.round(
          (a.scores.reduce((x, y) => x + y, 0) / a.scores.length) * 10
        ) / 10;
      const mispronunciationRate =
        Math.round((a.mispronouncedCount / a.scores.length) * 100) / 100;

      // Most common substitution candidate
      let likelySub: string | undefined;
      if (a.subCandidates.length > 0) {
        const freq: Record<string, number> = {};
        for (const s of a.subCandidates) freq[s] = (freq[s] ?? 0) + 1;
        const top = Object.entries(freq).sort((x, y) => y[1] - x[1])[0][0];
        likelySub = `/${top}/`;
      }

      return {
        symbol: `/${symbol}/`,
        avgScore,
        count: a.scores.length,
        mispronunciationRate,
        likelySub,
        exampleWords: [...a.exampleWords].slice(0, 3),
      };
    })
    .sort((a, b) => a.avgScore - b.avgScore); // worst first
}

// ─── Step 2: Call backend LLM chain for diagnostic cards ─────────────────────

const API_BASE =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    : "http://localhost:8000";

export async function generateLinguisticInsights(
  errorProfile: SortedErrorProfile,
  nativeLanguage: string
): Promise<FocusAreaCard[]> {
  const res = await fetch(`${API_BASE}/api/analysis/phoneme-insights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      error_profile: errorProfile,
      native_language: nativeLanguage,
    }),
  });

  if (!res.ok) throw new Error(`phoneme-insights failed: ${res.status}`);
  return res.json();
}
