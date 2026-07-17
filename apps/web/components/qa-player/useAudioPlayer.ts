import { useState, useRef, useCallback } from 'react';
import { message } from 'antd';

export const useAudioPlayer = (logDetails: SafeAny) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => {
        console.error('Audio play error:', err);
        message.error('Không thể phát file âm thanh này.');
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const skipTime = useCallback(
    (amount: number) => {
      if (!audioRef.current) return;
      audioRef.current.currentTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + amount));
    },
    [duration]
  );

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || logDetails?.duration || 0);
    }
  }, [logDetails]);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSliderChange = useCallback((value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  }, []);

  const handleSpeedChange = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  const seekTo = useCallback(
    (seconds: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = seconds;
        setCurrentTime(seconds);
        if (!isPlaying) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }
    },
    [isPlaying]
  );

  const formatTime = useCallback((secs: number | undefined) => {
    if (secs === undefined || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  return {
    audioRef,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    duration,
    setDuration,
    playbackRate,
    togglePlay,
    skipTime,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleAudioEnded,
    handleSliderChange,
    handleSpeedChange,
    seekTo,
    formatTime,
  };
};
export default useAudioPlayer;
