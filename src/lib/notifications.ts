import { supabase } from "@/integrations/supabase/client";

type NotificationType = "workout" | "habit" | "coach" | "event" | "gym" | "system";

interface CreateNotificationParams {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

/**
 * Creates a notification for a user.
 * Respects user notification preferences via the database function.
 * Email notifications are handled by the database trigger/function.
 */
export async function createNotification({
  userId,
  title,
  body,
  type = "system",
  entityType,
  entityId,
  actionUrl,
}: CreateNotificationParams): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("create_notification", {
      _user_id: userId,
      _title: title,
      _body: body,
      _type: type,
      _entity_type: entityType || null,
      _entity_id: entityId || null,
      _action_url: actionUrl || null,
    });

    if (error) {
      console.error("Error creating notification:", error);
      return null;
    }

    return data as string | null;
  } catch (err) {
    console.error("Failed to create notification:", err);
    return null;
  }
}

// Workout notification helpers
export async function notifyWorkoutCompleted(userId: string, workoutName: string, sessionId?: string) {
  return createNotification({
    userId,
    title: "Workout Completed",
    body: `You finished "${workoutName}". Great work!`,
    type: "workout",
    entityType: "workout_session",
    entityId: sessionId,
    actionUrl: sessionId ? `/progress?session=${sessionId}` : "/progress",
  });
}

export async function notifyPRSet(userId: string, exerciseName: string, value: string, exerciseId?: string) {
  return createNotification({
    userId,
    title: "Personal Record",
    body: `New PR on ${exerciseName}: ${value}`,
    type: "workout",
    entityType: "exercise",
    entityId: exerciseId,
    actionUrl: "/progress",
  });
}

// Coach notification helpers
export async function notifyCoachMessage(userId: string, coachName: string, requestId?: string) {
  return createNotification({
    userId,
    title: "New Coach Message",
    body: `${coachName} sent you a message`,
    type: "coach",
    entityType: "coach_request",
    entityId: requestId,
    actionUrl: "/find-coach",
  });
}

export async function notifyPlanAssigned(userId: string, planName: string, coachName: string, assignmentId?: string) {
  return createNotification({
    userId,
    title: "Training Plan Assigned",
    body: `${coachName} assigned "${planName}" to you`,
    type: "coach",
    entityType: "client_plan_assignment",
    entityId: assignmentId,
    actionUrl: "/train",
  });
}

export async function notifyNewWeekUnlocked(userId: string, planName: string, weekNumber: number, assignmentId?: string) {
  return createNotification({
    userId,
    title: "New Week Unlocked",
    body: `Week ${weekNumber} of "${planName}" is ready`,
    type: "coach",
    entityType: "client_plan_assignment",
    entityId: assignmentId,
    actionUrl: "/train",
  });
}

export async function notifyWorkoutScheduledToday(userId: string, workoutName: string, planName: string) {
  return createNotification({
    userId,
    title: "Today's Workout Ready",
    body: `"${workoutName}" from ${planName} is scheduled for today`,
    type: "coach",
    entityType: "plan_workout",
    actionUrl: "/train",
  });
}

export async function notifyMissedWorkout(userId: string, workoutName: string, planName: string) {
  return createNotification({
    userId,
    title: "Missed Workout",
    body: `You missed "${workoutName}" from ${planName}. Jump back in when you can!`,
    type: "coach",
    entityType: "plan_workout",
    actionUrl: "/train",
  });
}

export async function notifyPlanUpdatedByCoach(userId: string, planName: string, coachName: string, assignmentId?: string) {
  return createNotification({
    userId,
    title: "Plan Updated",
    body: `${coachName} made changes to "${planName}"`,
    type: "coach",
    entityType: "client_plan_assignment",
    entityId: assignmentId,
    actionUrl: "/train",
  });
}

export async function notifyStreakMilestone(userId: string, streakDays: number) {
  return createNotification({
    userId,
    title: "Streak Milestone! 🔥",
    body: `${streakDays} day workout streak! Keep it going!`,
    type: "workout",
    actionUrl: "/progress",
  });
}

export async function notifyCoachFeedback(userId: string, coachName: string, workoutName: string, sessionId?: string) {
  return createNotification({
    userId,
    title: "Coach Feedback",
    body: `${coachName} left feedback on your "${workoutName}" workout`,
    type: "coach",
    entityType: "workout_session",
    entityId: sessionId,
    actionUrl: sessionId ? `/progress?session=${sessionId}` : "/progress",
  });
}

export async function notifyCheckinDue(userId: string, coachName: string, checkinId?: string) {
  return createNotification({
    userId,
    title: "Check-in Due",
    body: `${coachName} is waiting for your check-in`,
    type: "coach",
    entityType: "client_checkin",
    entityId: checkinId,
    actionUrl: "/train",
  });
}

export async function notifyCheckinOverdue(userId: string, coachName: string, daysPast: number, checkinId?: string) {
  return createNotification({
    userId,
    title: "Check-in Overdue",
    body: `Your check-in for ${coachName} is ${daysPast} day${daysPast > 1 ? 's' : ''} overdue`,
    type: "coach",
    entityType: "client_checkin",
    entityId: checkinId,
    actionUrl: "/train",
  });
}

// Event notification helpers
export async function notifyEventRegistered(userId: string, eventName: string, eventId?: string) {
  return createNotification({
    userId,
    title: "Registration Confirmed",
    body: `You're registered for "${eventName}"`,
    type: "event",
    entityType: "event",
    entityId: eventId,
    actionUrl: eventId ? `/events?event=${eventId}` : "/events",
  });
}

export async function notifyEventWaitlisted(userId: string, eventName: string, eventId?: string) {
  return createNotification({
    userId,
    title: "Added to Waitlist",
    body: `You've been added to the waitlist for "${eventName}"`,
    type: "event",
    entityType: "event",
    entityId: eventId,
    actionUrl: eventId ? `/events?event=${eventId}` : "/events",
  });
}

export async function notifyPromotedFromWaitlist(userId: string, eventName: string, eventId?: string) {
  return createNotification({
    userId,
    title: "Spot Available!",
    body: `A spot opened up for "${eventName}" and you're in!`,
    type: "event",
    entityType: "event",
    entityId: eventId,
    actionUrl: eventId ? `/events?event=${eventId}` : "/events",
  });
}

export async function notifyWorkoutReleased(userId: string, eventName: string, workoutName: string, workoutId?: string) {
  return createNotification({
    userId,
    title: "Workout Released",
    body: `"${workoutName}" is now available for ${eventName}`,
    type: "event",
    entityType: "event_workout",
    entityId: workoutId,
    actionUrl: "/events",
  });
}

export async function notifyHeatAssigned(userId: string, eventName: string, heatInfo: string, heatId?: string) {
  return createNotification({
    userId,
    title: "Heat Assignment",
    body: `${eventName}: ${heatInfo}`,
    type: "event",
    entityType: "event_heat",
    entityId: heatId,
    actionUrl: "/events",
  });
}

export async function notifyScoreSubmitted(userId: string, workoutName: string, scoreId?: string) {
  return createNotification({
    userId,
    title: "Score Submitted",
    body: `Your score for "${workoutName}" has been submitted`,
    type: "event",
    entityType: "event_score",
    entityId: scoreId,
    actionUrl: "/events",
  });
}

export async function notifyScoreRejected(userId: string, workoutName: string, reason: string, scoreId?: string) {
  return createNotification({
    userId,
    title: "Score Rejected",
    body: `Your score for "${workoutName}" was rejected: ${reason}`,
    type: "event",
    entityType: "event_score",
    entityId: scoreId,
    actionUrl: "/events",
  });
}

// Gym notification helpers
export async function notifyGymInvite(userId: string, gymName: string, inviteId?: string) {
  return createNotification({
    userId,
    title: "Gym Invitation",
    body: `You've been invited to join ${gymName}`,
    type: "gym",
    entityType: "gym_invitation",
    entityId: inviteId,
    actionUrl: "/gym-membership",
  });
}

export async function notifyMembershipActivated(userId: string, gymName: string, membershipId?: string) {
  return createNotification({
    userId,
    title: "Membership Active",
    body: `Your membership at ${gymName} is now active`,
    type: "gym",
    entityType: "membership",
    entityId: membershipId,
    actionUrl: "/gym-membership",
  });
}

export async function notifyMembershipSuspended(userId: string, gymName: string, membershipId?: string) {
  return createNotification({
    userId,
    title: "Membership Suspended",
    body: `Your membership at ${gymName} has been suspended`,
    type: "gym",
    entityType: "membership",
    entityId: membershipId,
    actionUrl: "/gym-membership",
  });
}

export async function notifyMembershipCancelled(userId: string, gymName: string, membershipId?: string) {
  return createNotification({
    userId,
    title: "Membership Cancelled",
    body: `Your membership at ${gymName} has been cancelled`,
    type: "gym",
    entityType: "membership",
    entityId: membershipId,
    actionUrl: "/gym-membership",
  });
}

// System notification helpers
export async function notifyRoleChanged(userId: string, newRole: string) {
  return createNotification({
    userId,
    title: "Role Updated",
    body: `Your account role has been updated to ${newRole}`,
    type: "system",
    actionUrl: "/profile",
  });
}

export async function notifyAdminAnnouncement(userId: string, title: string, body: string) {
  return createNotification({
    userId,
    title,
    body,
    type: "system",
  });
}
