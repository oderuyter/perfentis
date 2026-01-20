import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { loadSavedWorkout, clearSavedWorkout } from '@/hooks/useWorkoutState';

interface RecoverableWorkout {
  workoutId: string;
  workoutName: string;
  elapsedTime: number;
  currentExerciseIndex: number;
  savedAt: string;
  source: 'local' | 'database';
}

export function useWorkoutRecovery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recoverableWorkout, setRecoverableWorkout] = useState<RecoverableWorkout | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkForRecoverableWorkouts() {
      setIsChecking(true);
      
      try {
        // First check localStorage for in-progress workout
        const localWorkout = loadSavedWorkout();
        if (localWorkout && localWorkout.status === 'active') {
          setRecoverableWorkout({
            workoutId: localWorkout.workoutId,
            workoutName: localWorkout.workoutName,
            elapsedTime: localWorkout.elapsedTime,
            currentExerciseIndex: localWorkout.currentExerciseIndex,
            savedAt: localWorkout.lastSavedAt || new Date().toISOString(),
            source: 'local',
          });
          setIsChecking(false);
          return;
        }

        // Then check database for any in-progress sessions (for cross-device recovery)
        if (user?.id) {
          const { data: inProgressSession } = await supabase
            .from('workout_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('started_at', { ascending: false })
            .limit(1)
            .single();

          if (inProgressSession) {
            // Check if session is less than 4 hours old
            const sessionAge = Date.now() - new Date(inProgressSession.started_at).getTime();
            const fourHours = 4 * 60 * 60 * 1000;
            
            if (sessionAge < fourHours) {
              setRecoverableWorkout({
                workoutId: inProgressSession.workout_template_id || '',
                workoutName: inProgressSession.workout_name || 'Workout',
                elapsedTime: Math.floor(sessionAge / 1000),
                currentExerciseIndex: 0,
                savedAt: inProgressSession.synced_at || inProgressSession.started_at,
                source: 'database',
              });
            } else {
              // Mark old sessions as abandoned
              await supabase
                .from('workout_sessions')
                .update({ status: 'abandoned' })
                .eq('id', inProgressSession.id);
            }
          }
        }
      } catch (error) {
        console.error('Error checking for recoverable workouts:', error);
      } finally {
        setIsChecking(false);
      }
    }

    checkForRecoverableWorkouts();
  }, [user?.id]);

  const resumeWorkout = () => {
    if (recoverableWorkout) {
      navigate(`/workout/${recoverableWorkout.workoutId}`);
      setRecoverableWorkout(null);
    }
  };

  const discardWorkout = async () => {
    if (recoverableWorkout) {
      // Clear local storage
      clearSavedWorkout();
      
      // Mark database session as abandoned if it exists
      if (recoverableWorkout.source === 'database' && user?.id) {
        await supabase
          .from('workout_sessions')
          .update({ status: 'abandoned' })
          .eq('user_id', user.id)
          .eq('status', 'in_progress');
      }
      
      setRecoverableWorkout(null);
    }
  };

  const dismissPrompt = () => {
    setRecoverableWorkout(null);
  };

  return {
    recoverableWorkout,
    isChecking,
    resumeWorkout,
    discardWorkout,
    dismissPrompt,
    hasRecoverableWorkout: !!recoverableWorkout,
  };
}

// Helper to format elapsed time
export function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
