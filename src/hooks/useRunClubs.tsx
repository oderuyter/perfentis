import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RunClub {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  owner_user_id: string;
  status: 'draft' | 'published' | 'suspended';
  primary_city: string | null;
  primary_postcode: string | null;
  primary_country: string | null;
  meeting_locations: unknown;
  club_style: 'social' | 'competitive' | 'mixed' | null;
  distances_offered: string[];
  days_of_week: number[];
  pace_groups: unknown;
  membership_type: 'free' | 'paid';
  membership_fee: number | null;
  membership_fee_cadence: 'monthly' | 'quarterly' | 'annually' | 'one-time' | null;
  membership_benefits: string | null;
  membership_expectations: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  strava_club_url: string | null;
  applications_enabled: boolean;
  auto_approve_applications: boolean;
  created_at: string;
  updated_at: string;
}

export interface RunClubApplication {
  id: string;
  run_club_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  rejection_reason: string | null;
  applicant_name: string | null;
  applicant_email: string | null;
  applied_at: string;
  run_club?: RunClub;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface RunClubMember {
  id: string;
  run_club_id: string;
  user_id: string;
  status: 'active' | 'suspended' | 'cancelled';
  joined_at: string;
  suspended_at: string | null;
  internal_notes: string | null;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export interface RunClubRun {
  id: string;
  run_club_id: string;
  title: string;
  description: string | null;
  is_recurring: boolean;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  one_off_date: string | null;
  meeting_point: string | null;
  distances: string[];
  pace_groups: unknown;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all-levels' | null;
  attendance_tracking_enabled: boolean;
  is_active: boolean;
  notes: string | null;
}

export interface RunClubEvent {
  id: string;
  run_club_id: string;
  title: string;
  description: string | null;
  event_type: 'race' | 'time_trial' | 'social' | 'training' | 'other';
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  distances: string[];
  capacity: number | null;
  registration_required: boolean;
  status: 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

// Hook to fetch published run clubs for the finder
export function useRunClubFinder() {
  const [clubs, setClubs] = useState<RunClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClubs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("run_clubs")
        .select("*")
        .eq("status", "published")
        .order("name");

      if (error) throw error;
      setClubs((data || []) as unknown as RunClub[]);
    } catch (error) {
      console.error("Error fetching run clubs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return { clubs, isLoading, refetch: fetchClubs };
}

// Hook to check user's membership/application status for a club
export function useRunClubStatus(clubId: string | null) {
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [isOrganiser, setIsOrganiser] = useState(false);
  const [application, setApplication] = useState<RunClubApplication | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user || !clubId) {
      setIsLoading(false);
      return;
    }

    try {
      // Check membership
      const { data: membership } = await supabase
        .from("run_club_members")
        .select("*")
        .eq("run_club_id", clubId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      setIsMember(!!membership);

      // Check organiser status
      const { data: organiser } = await supabase
        .from("run_club_organisers")
        .select("*")
        .eq("run_club_id", clubId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Also check if owner
      const { data: club } = await supabase
        .from("run_clubs")
        .select("owner_user_id")
        .eq("id", clubId)
        .single();

      setIsOrganiser(!!organiser || club?.owner_user_id === user.id);

      // Check pending application
      const { data: app } = await supabase
        .from("run_club_applications")
        .select("*")
        .eq("run_club_id", clubId)
        .eq("user_id", user.id)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setApplication(app as RunClubApplication | null);
    } catch (error) {
      console.error("Error fetching run club status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, clubId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { isMember, isOrganiser, application, isLoading, refetch: fetchStatus };
}

// Hook for user's run club memberships
export function useUserRunClubs() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<(RunClubMember & { run_club: RunClub })[]>([]);
  const [applications, setApplications] = useState<RunClubApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch memberships with club details
      const { data: memberData } = await supabase
        .from("run_club_members")
        .select(`
          *,
          run_club:run_clubs(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      setMemberships((memberData || []) as any);

      // Fetch pending applications
      const { data: appData } = await supabase
        .from("run_club_applications")
        .select(`
          *,
          run_club:run_clubs(*)
        `)
        .eq("user_id", user.id)
        .eq("status", "pending");

      setApplications((appData || []) as any);
    } catch (error) {
      console.error("Error fetching user run clubs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { memberships, applications, isLoading, refetch: fetchData };
}

// Hook for owned/organised run clubs (also includes admin access)
export function useOwnedRunClubs() {
  const { user } = useAuth();
  const [clubs, setClubs] = useState<RunClub[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const hasRunClubAccess = clubs.length > 0 || isAdmin;

  const fetchClubs = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Check if user is admin
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .eq("is_active", true)
        .maybeSingle();

      const userIsAdmin = !!adminRole;
      setIsAdmin(userIsAdmin);

      // If admin, fetch all clubs
      if (userIsAdmin) {
        const { data: allClubs } = await supabase
          .from("run_clubs")
          .select("*")
          .order("name");
        
        setClubs((allClubs || []) as unknown as RunClub[]);
        setIsLoading(false);
        return;
      }

      // Fetch clubs where user is owner
      const { data: ownedClubs } = await supabase
        .from("run_clubs")
        .select("*")
        .eq("owner_user_id", user.id);

      // Fetch clubs where user is organiser
      const { data: organiserRoles } = await supabase
        .from("run_club_organisers")
        .select("run_club_id")
        .eq("user_id", user.id);

      const organiserClubIds = (organiserRoles || []).map(r => r.run_club_id);

      let organisedClubs: RunClub[] = [];
      if (organiserClubIds.length > 0) {
        const { data } = await supabase
          .from("run_clubs")
          .select("*")
          .in("id", organiserClubIds);
        organisedClubs = (data || []) as RunClub[];
      }

      // Combine and dedupe
      const allClubs = [...(ownedClubs || []), ...organisedClubs];
      const uniqueClubs = allClubs.reduce((acc, club) => {
        if (!acc.find(c => c.id === club.id)) {
          acc.push(club as unknown as RunClub);
        }
        return acc;
      }, [] as RunClub[]);

      setClubs(uniqueClubs);
    } catch (error) {
      console.error("Error fetching owned run clubs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return { clubs, isLoading, hasRunClubAccess, isAdmin, refetch: fetchClubs };
}

// Hook for run club management (organiser portal)
export function useRunClubManagement(clubId: string | null) {
  const [club, setClub] = useState<RunClub | null>(null);
  const [members, setMembers] = useState<RunClubMember[]>([]);
  const [applications, setApplications] = useState<RunClubApplication[]>([]);
  const [runs, setRuns] = useState<RunClubRun[]>([]);
  const [events, setEvents] = useState<RunClubEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClub = useCallback(async () => {
    if (!clubId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("run_clubs")
        .select("*")
        .eq("id", clubId)
        .single();

      if (error) throw error;
      setClub(data as unknown as RunClub);
    } catch (error) {
      console.error("Error fetching club:", error);
    }
  }, [clubId]);

  const fetchMembers = useCallback(async () => {
    if (!clubId) return;

    try {
      const { data } = await supabase
        .from("run_club_members")
        .select(`
          *,
          profile:profiles(display_name, avatar_url, email)
        `)
        .eq("run_club_id", clubId)
        .order("joined_at", { ascending: false });

      setMembers((data || []) as any);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  }, [clubId]);

  const fetchApplications = useCallback(async () => {
    if (!clubId) return;

    try {
      const { data } = await supabase
        .from("run_club_applications")
        .select(`
          *,
          profile:profiles(display_name, avatar_url)
        `)
        .eq("run_club_id", clubId)
        .order("applied_at", { ascending: false });

      setApplications((data || []) as any);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  }, [clubId]);

  const fetchRuns = useCallback(async () => {
    if (!clubId) return;

    try {
      const { data } = await supabase
        .from("run_club_runs")
        .select("*")
        .eq("run_club_id", clubId)
        .order("day_of_week");

      setRuns((data || []) as unknown as RunClubRun[]);
    } catch (error) {
      console.error("Error fetching runs:", error);
    }
  }, [clubId]);

  const fetchEvents = useCallback(async () => {
    if (!clubId) return;

    try {
      const { data } = await supabase
        .from("run_club_events")
        .select("*")
        .eq("run_club_id", clubId)
        .order("event_date");

      setEvents((data || []) as RunClubEvent[]);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [clubId]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchClub(),
      fetchMembers(),
      fetchApplications(),
      fetchRuns(),
      fetchEvents()
    ]);
    setIsLoading(false);
  }, [fetchClub, fetchMembers, fetchApplications, fetchRuns, fetchEvents]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Actions
  const updateClub = async (updates: Partial<RunClub>) => {
    if (!clubId) return;

    const { error } = await supabase
      .from("run_clubs")
      .update(updates as any)
      .eq("id", clubId);

    if (error) throw error;
    await fetchClub();
  };

  const approveApplication = async (applicationId: string) => {
    const { error } = await supabase.rpc("approve_run_club_application", {
      p_application_id: applicationId
    });

    if (error) throw error;
    await Promise.all([fetchApplications(), fetchMembers()]);
  };

  const rejectApplication = async (applicationId: string, reason?: string) => {
    const { error } = await supabase.rpc("reject_run_club_application", {
      p_application_id: applicationId,
      p_reason: reason || null
    });

    if (error) throw error;
    await fetchApplications();
  };

  const suspendMember = async (memberId: string, reason?: string) => {
    const { error } = await supabase
      .from("run_club_members")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString(),
        suspension_reason: reason
      })
      .eq("id", memberId);

    if (error) throw error;
    await fetchMembers();
  };

  const reinstateMember = async (memberId: string) => {
    const { error } = await supabase
      .from("run_club_members")
      .update({
        status: "active",
        suspended_at: null,
        suspension_reason: null
      })
      .eq("id", memberId);

    if (error) throw error;
    await fetchMembers();
  };

  const createRun = async (run: Partial<RunClubRun>) => {
    if (!clubId) return;

    const { error } = await supabase
      .from("run_club_runs")
      .insert({ ...(run as Record<string, unknown>), run_club_id: clubId } as any);

    if (error) throw error;
    await fetchRuns();
  };

  const updateRun = async (runId: string, updates: Partial<RunClubRun>) => {
    const { error } = await supabase
      .from("run_club_runs")
      .update(updates as any)
      .eq("id", runId);

    if (error) throw error;
    await fetchRuns();
  };

  const deleteRun = async (runId: string) => {
    const { error } = await supabase
      .from("run_club_runs")
      .delete()
      .eq("id", runId);

    if (error) throw error;
    await fetchRuns();
  };

  const createEvent = async (event: Partial<RunClubEvent>) => {
    if (!clubId) return;

    const { error } = await supabase
      .from("run_club_events")
      .insert({ ...(event as Record<string, unknown>), run_club_id: clubId } as any);

    if (error) throw error;
    await fetchEvents();
  };

  const updateEvent = async (eventId: string, updates: Partial<RunClubEvent>) => {
    const { error } = await supabase
      .from("run_club_events")
      .update(updates)
      .eq("id", eventId);

    if (error) throw error;
    await fetchEvents();
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("run_club_events")
      .delete()
      .eq("id", eventId);

    if (error) throw error;
    await fetchEvents();
  };

  return {
    club,
    members,
    applications,
    runs,
    events,
    isLoading,
    refetch: fetchAll,
    updateClub,
    approveApplication,
    rejectApplication,
    suspendMember,
    reinstateMember,
    createRun,
    updateRun,
    deleteRun,
    createEvent,
    updateEvent,
    deleteEvent
  };
}

// Apply to join a run club
export async function applyToRunClub(
  clubId: string,
  userId: string,
  message?: string,
  applicantDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  }
) {
  // Create application
  const { data: app, error: appError } = await supabase
    .from("run_club_applications")
    .insert({
      run_club_id: clubId,
      user_id: userId,
      message,
      applicant_name: applicantDetails?.name,
      applicant_email: applicantDetails?.email,
      applicant_phone: applicantDetails?.phone
    })
    .select()
    .single();

  if (appError) throw appError;

  // Create CRM lead
  const { data: leadData } = await supabase
    .from("crm_leads")
    .insert({
      context_type: "run_club",
      context_id: clubId,
      lead_name: applicantDetails?.name || "New Applicant",
      email: applicantDetails?.email,
      phone: applicantDetails?.phone,
      user_id: userId,
      is_registered_user: true,
      source: "form"
    })
    .select()
    .single();

  // Update application with CRM lead ID
  if (leadData) {
    await supabase
      .from("run_club_applications")
      .update({ crm_lead_id: leadData.id })
      .eq("id", app.id);
  }

  // Create conversation
  const { data: conversation } = await supabase.rpc("create_conversation_rpc", {
    p_context_type: "run_club",
    p_context_id: clubId,
    p_subject: `Application from ${applicantDetails?.name || "New Member"}`,
    p_initial_message: message || "I'd like to join your run club!"
  });

  // Update application with conversation ID
  if (conversation) {
    await supabase
      .from("run_club_applications")
      .update({ conversation_id: conversation })
      .eq("id", app.id);
  }

  return app;
}

// Create a new run club
export async function createRunClub(
  userId: string,
  clubData: Partial<RunClub>
) {
  const { data, error } = await supabase
    .from("run_clubs")
    .insert({
      ...(clubData as Record<string, unknown>),
      owner_user_id: userId,
      status: "draft"
    } as any)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as RunClub;
}
