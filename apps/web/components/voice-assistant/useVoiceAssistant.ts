'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { message as antMessage } from 'antd';
import { apiClient } from '../../lib/api-client';
import { VoiceStatus, ChatMessage } from './types';
import { soundEffects } from './sound-effects';
import { speakText, stopSpeaking } from './speech-utils';

export function useVoiceAssistant(options?: { userName?: string; userRole?: string }) {
  const pathname = usePathname();
  const userName = options?.userName;
  const userRole = options?.userRole;
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const lastCtrlPressTimeRef = useRef<number>(0);
  const currentTranscriptRef = useRef<string>('');
  const isListeningRef = useRef<boolean>(false);

  // Check SpeechRecognition support in current browser
  const [hasSpeechRecognition, setHasSpeechRecognition] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setHasSpeechRecognition(Boolean(SpeechRecognition));
    }
  }, []);

  // Send message to AI Backend & Speak Response
  const sendMessage = useCallback(
    async (textToSend: string) => {
      if (!textToSend || !textToSend.trim()) return;

      const trimmedText = textToSend.trim();
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        text: trimmedText,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setTranscript('');
      currentTranscriptRef.current = '';
      setStatus('thinking');
      setErrorMessage(null);

      try {
        const historyForApi = messages.slice(-4).map((m) => ({
          role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
          text: m.text,
        }));

        const response = await apiClient.ai.voiceChat({
          message: trimmedText,
          context: {
            pathname,
            userName: userName || 'Quản trị viên',
            userRole: userRole || 'Staff',
          },
          history: historyForApi,
        });

        const replyText = response.reply || 'Tôi đã nhận được thông tin.';
        const assistantMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          source: response.source,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Speak aloud via TTS if not muted
        if (!isMuted) {
          setStatus('speaking');
          speakText(replyText, {
            onStart: () => setStatus('speaking'),
            onEnd: () => setStatus('idle'),
            onError: () => setStatus('idle'),
          });
        } else {
          setStatus('idle');
        }
      } catch (err: any) {
        const errorText = 'Xin lỗi, trợ lý AI đang bận hoặc gặp sự cố kết nối. Vui lòng thử lại sau.';
        setErrorMessage(errorText);

        const errorMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: errorText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);

        if (!isMuted) {
          setStatus('speaking');
          speakText(errorText, {
            onStart: () => setStatus('speaking'),
            onEnd: () => setStatus('idle'),
            onError: () => setStatus('idle'),
          });
        } else {
          setStatus('idle');
        }
      }
    },
    [messages, pathname, userName, userRole, isMuted]
  );

  // Stop listening and immediately send recorded transcript
  const stopListeningAndSend = useCallback(() => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop error
      }
      isListeningRef.current = false;
    }
    soundEffects.playStopChime();

    const textToSubmit = currentTranscriptRef.current.trim();
    if (textToSubmit) {
      sendMessage(textToSubmit);
    } else {
      setStatus('idle');
    }
  }, [sendMessage]);

  // Start speech recognition
  const startListening = useCallback(() => {
    // Stop any ongoing speech playback
    stopSpeaking();

    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      antMessage.warning('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói (Web Speech API).');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore abort error
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setStatus('listening');
        setTranscript('');
        currentTranscriptRef.current = '';
        soundEffects.playStartChime();
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        currentTranscriptRef.current = currentText;
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        isListeningRef.current = false;
        if (event.error === 'not-allowed') {
          antMessage.error('Vui lòng cấp quyền Microphone trên trình duyệt để sử dụng Voice Chat.');
        }
        setStatus('idle');
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        const textToSubmit = currentTranscriptRef.current.trim();
        if (textToSubmit) {
          soundEffects.playStopChime();
          sendMessage(textToSubmit);
        } else {
          setStatus('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Start recognition error:', err);
      setStatus('idle');
    }
  }, [sendMessage]);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (status === 'listening') {
      stopListeningAndSend();
    } else {
      if (!isOpen) setIsOpen(true);
      startListening();
    }
  }, [status, isOpen, stopListeningAndSend, startListening]);

  // Stop speaking
  const handleStopSpeaking = useCallback(() => {
    stopSpeaking();
    setStatus('idle');
  }, []);

  // Replay last assistant message
  const replayLastMessage = useCallback(() => {
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
    if (lastAssistantMsg) {
      setStatus('speaking');
      speakText(lastAssistantMsg.text, {
        onStart: () => setStatus('speaking'),
        onEnd: () => setStatus('idle'),
        onError: () => setStatus('idle'),
      });
    }
  }, [messages]);

  // Global Double-press Ctrl shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Control key is pressed
      if (e.key === 'Control' || e.keyCode === 17) {
        const now = Date.now();
        const diff = now - lastCtrlPressTimeRef.current;

        if (diff > 50 && diff < 450) {
          // Double-press Ctrl detected!
          e.preventDefault();
          lastCtrlPressTimeRef.current = 0;

          if (!isOpen) {
            setIsOpen(true);
            // Slight tick to ensure window focus
            setTimeout(() => {
              startListening();
            }, 50);
          } else {
            if (status === 'listening') {
              stopListeningAndSend();
            } else {
              startListening();
            }
          }
        } else {
          lastCtrlPressTimeRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, status, startListening, stopListeningAndSend]);

  return {
    isOpen,
    setIsOpen,
    status,
    transcript,
    messages,
    isMuted,
    setIsMuted,
    errorMessage,
    hasSpeechRecognition,
    startListening,
    stopListeningAndSend,
    toggleListening,
    handleStopSpeaking,
    replayLastMessage,
    sendMessage,
  };
}
