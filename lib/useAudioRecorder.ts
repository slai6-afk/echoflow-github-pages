"use client";

import { useState, useRef, useCallback } from "react";

interface RecorderState {
  isRecording: boolean;
  audioBlob: Blob | null;
  analyserNode: AnalyserNode | null;
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    audioBlob: null,
    analyserNode: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up Web Audio API for visualisation
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setState((s) => ({ ...s, isRecording: false, audioBlob: blob }));
        stream.getTracks().forEach((t) => t.stop());
        audioContextRef.current?.close();
        analyserRef.current = null;
      };

      mediaRecorderRef.current.start(100);
      setState({
        isRecording: true,
        audioBlob: null,
        analyserNode: analyserRef.current,
        error: null,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        error: "Microphone access denied. Please enable mic permissions.",
      }));
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setState({ isRecording: false, audioBlob: null, analyserNode: null, error: null });
    chunksRef.current = [];
  }, []);

  return { ...state, startRecording, stopRecording, reset };
}
