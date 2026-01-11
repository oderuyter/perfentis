import { useState, useEffect } from "react";

const STORAGE_KEY = "workout_media_controls_enabled";

export function useWorkoutMediaPreference() {
  const [showMediaControls, setShowMediaControls] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(showMediaControls));
  }, [showMediaControls]);

  return {
    showMediaControls,
    setShowMediaControls,
  };
}
