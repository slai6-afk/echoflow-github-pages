export const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

export async function evaluatePronunciation(
  audioBlob: Blob,
  referenceText: string
) {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");
  form.append("reference_text", referenceText);

  const res = await fetch(`${API_BASE}/api/assessment/evaluate`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Assessment failed");
  return res.json();
}

export async function getLinguistReport(
  assessmentData: object,
  nativeLanguage: string
) {
  const res = await fetch(`${API_BASE}/api/analysis/linguist-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessment_data: assessmentData, native_language: nativeLanguage }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function getTechArticles() {
  const res = await fetch(`${API_BASE}/api/content/articles`);
  if (!res.ok) throw new Error("Content fetch failed");
  return res.json();
}

export async function getYoutubeClips() {
  const res = await fetch(`${API_BASE}/api/content/youtube-clips`);
  if (!res.ok) throw new Error("YouTube clips fetch failed");
  return res.json();
}

export async function fetchTtsAudio(text: string, voice = "alloy"): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/content/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  if (!res.ok) throw new Error("TTS unavailable");
  return res.blob();
}

export async function analyzeImportedAudio(audioBlob: Blob, role = "UX Designer", nativeLanguage = "") {
  const form = new FormData();
  form.append("audio", audioBlob, "import.webm");
  form.append("role", role);
  form.append("native_language", nativeLanguage);

  const res = await fetch(`${API_BASE}/api/assessment/analyze-import`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Import analysis failed");
  return res.json();
}

export async function chatMessage(message: string, history: { role: string; content: string }[]) {
  const res = await fetch(`${API_BASE}/api/analysis/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Chat failed");
  return res.json();
}
