import { useState, useEffect, useCallback } from "react";

export interface MediaTrack {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
}

export interface MediaSessionState {
  isPlaying: boolean;
  track: MediaTrack | null;
  position?: number;
  hasActiveSession: boolean;
}

// Mock data for demo purposes
const mockTracks: MediaTrack[] = [
  { title: "Run Boy Run", artist: "Woodkid", album: "The Golden Age", artwork: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop" },
  { title: "Power", artist: "Kanye West", album: "My Beautiful Dark Twisted Fantasy", artwork: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop" },
  { title: "Stronger", artist: "Kelly Clarkson", album: "Stronger", artwork: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&h=100&fit=crop" },
  { title: "Eye of the Tiger", artist: "Survivor", album: "Eye of the Tiger", artwork: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&h=100&fit=crop" },
];

export function useMediaSession() {
  const [state, setState] = useState<MediaSessionState>({
    isPlaying: false,
    track: null,
    position: 0,
    hasActiveSession: false,
  });
  const [trackIndex, setTrackIndex] = useState(0);

  // Initialize media session if browser supports it
  useEffect(() => {
    if ("mediaSession" in navigator) {
      // Set up media session handlers
      navigator.mediaSession.setActionHandler("play", () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        handlePrevious();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        handleNext();
      });
    }
  }, []);

  // Simulate detecting an active media session
  // In production, this would integrate with the OS media session
  const startMockSession = useCallback(() => {
    const track = mockTracks[trackIndex];
    setState({
      isPlaying: true,
      track,
      position: 0,
      hasActiveSession: true,
    });

    if ("mediaSession" in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork ? [{ src: track.artwork, sizes: "100x100", type: "image/jpeg" }] : undefined,
      });
    }
  }, [trackIndex]);

  const togglePlayPause = useCallback(() => {
    setState(prev => {
      if (!prev.hasActiveSession) {
        // Start a new mock session
        return {
          isPlaying: true,
          track: mockTracks[0],
          position: 0,
          hasActiveSession: true,
        };
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  }, []);

  const handleNext = useCallback(() => {
    setTrackIndex(prev => {
      const newIndex = (prev + 1) % mockTracks.length;
      const track = mockTracks[newIndex];
      setState(prevState => ({
        ...prevState,
        track,
        position: 0,
        hasActiveSession: true,
      }));
      return newIndex;
    });
  }, []);

  const handlePrevious = useCallback(() => {
    setTrackIndex(prev => {
      const newIndex = prev === 0 ? mockTracks.length - 1 : prev - 1;
      const track = mockTracks[newIndex];
      setState(prevState => ({
        ...prevState,
        track,
        position: 0,
        hasActiveSession: true,
      }));
      return newIndex;
    });
  }, []);

  const stopSession = useCallback(() => {
    setState({
      isPlaying: false,
      track: null,
      position: 0,
      hasActiveSession: false,
    });
  }, []);

  return {
    ...state,
    togglePlayPause,
    handleNext,
    handlePrevious,
    startMockSession,
    stopSession,
  };
}
