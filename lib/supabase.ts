import { createOptionalClient } from "@/lib/supabase-browser";
import { WordResult } from "@/components/training/PhonemeBreakdown";

interface AssessmentPayload {
  videoId: string;
  sentenceText: string;
  overallScore: number;
  words: WordResult[];
}

export async function saveAssessmentResult(payload: AssessmentPayload): Promise<void> {
  const supabase = createOptionalClient();
  if (!supabase) return;

  // Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? "anonymous";

  const { error: logErr } = await supabase.from("shadowing_logs").insert({
    user_id: userId,
    video_id: payload.videoId,
    sentence_text: payload.sentenceText,
    overall_score: Math.round(payload.overallScore),
  });

  if (logErr) console.warn("shadowing_logs insert:", logErr.message);

  const phonemeErrors: Array<{
    user_id: string;
    word: string;
    expected_phoneme: string;
    actual_phoneme: string;
    accuracy_score: number;
  }> = [];

  for (const word of payload.words) {
    if (word.error_type === "None") continue;
    for (const ph of word.phonemes) {
      if (ph.accuracy_score < 80) {
        phonemeErrors.push({
          user_id: userId,
          word: word.word,
          expected_phoneme: ph.phoneme,
          actual_phoneme: word.error_type === "Mispronunciation" ? `~${ph.phoneme}` : "",
          accuracy_score: Math.round(ph.accuracy_score),
        });
      }
    }
  }

  if (phonemeErrors.length > 0) {
    const { error: phErr } = await supabase.from("phoneme_errors").insert(phonemeErrors);
    if (phErr) console.warn("phoneme_errors insert:", phErr.message);
  }
}
