// Type re-exports for timer component props
import type { useEmomTimer, useAmrapTimer } from "@/hooks/useBlockTimer";

export type UseEmomTimerReturn = ReturnType<typeof useEmomTimer>;
export type UseAmrapTimerReturn = ReturnType<typeof useAmrapTimer>;
