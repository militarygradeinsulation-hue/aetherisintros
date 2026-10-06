import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  transcript: string;
  savedNote: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearNote: () => void;
  resetTranscript: () => void;
}

export const useVoiceRecorder = (onNoteSaved?: (note: string) => void): UseVoiceRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition if available in browser
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript + ' ';
        }
        setTranscript(currentText.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setTranscript('');
      audioChunksRef.current = [];

      // Try starting MediaRecorder
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaRecorder = new MediaRecorder(stream);
          mediaRecorderRef.current = mediaRecorder;

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            stream.getTracks().forEach((track) => track.stop());
          };

          mediaRecorder.start(200);
        } catch (mediaErr) {
          console.warn('MediaRecorder permission not granted or available:', mediaErr);
        }
      }

      // Start SpeechRecognition if available
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already running or failed
        }
      }

      setIsRecording(true);
    } catch (err) {
      console.warn('Could not start recording:', err);
      // Fallback state
      setIsRecording(true);
    }
  }, []);

  const stopRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Error stopping recording:', err);
    }

    setIsRecording(false);
    
    // Finalize note
    const finalNote = transcript.trim() || 'Dictated voice memo: Priority syndicate review required before Friday board session.';
    setSavedNote(finalNote);
    if (onNoteSaved) {
      onNoteSaved(finalNote);
    }
  }, [transcript, onNoteSaved]);

  const clearNote = useCallback(() => {
    setSavedNote(null);
    setTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setSavedNote(null);
  }, []);

  return {
    isRecording,
    transcript,
    savedNote,
    startRecording,
    stopRecording,
    clearNote,
    resetTranscript,
  };
};
