import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Gym {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  logo_url: string | null;
  owner_id: string | null;
  status: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  gym_id: string;
  status: string;
  tier: string | null;
  membership_token: string;
  membership_number: string | null;
  start_date: string | null;
  next_payment_date: string | null;
  payment_status: string | null;
  created_at: string;
  updated_at: string;
  gym?: Gym;
}

export interface GymStaff {
  id: string;
  gym_id: string;
  user_id: string;
  position: string | null;
  hire_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymClass {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSchedule {
  id: string;
  class_id: string;
  instructor_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  gym_class?: GymClass;
}

export interface ClassBooking {
  id: string;
  schedule_id: string;
  user_id: string;
  booking_date: string;
  status: string;
  created_at: string;
}

export function useUserMemberships() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("memberships")
        .select(`
          *,
          gym:gyms(*)
        `)
        .eq("user_id", user.id);

      if (error) throw error;
      setMemberships((data || []) as Membership[]);
    } catch (error) {
      console.error("Error fetching memberships:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  const cancelMembership = async (membershipId: string) => {
    try {
      const { error } = await supabase
        .from("memberships")
        .update({ status: "cancelled" })
        .eq("id", membershipId);

      if (error) throw error;
      toast.success("Membership cancelled");
      fetchMemberships();
    } catch (error) {
      console.error("Error cancelling membership:", error);
      toast.error("Failed to cancel membership");
    }
  };

  return { memberships, isLoading, refetch: fetchMemberships, cancelMembership };
}

export function useGymMembers(gymId: string | null) {
  const [members, setMembers] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!gymId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("memberships")
        .select("*")
        .eq("gym_id", gymId);

      if (error) throw error;
      setMembers((data || []) as Membership[]);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateMemberStatus = async (membershipId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("memberships")
        .update({ status })
        .eq("id", membershipId);

      if (error) throw error;
      toast.success(`Member ${status}`);
      fetchMembers();
    } catch (error) {
      console.error("Error updating member:", error);
      toast.error("Failed to update member");
    }
  };

  return { members, isLoading, refetch: fetchMembers, updateMemberStatus };
}

export function useGymClasses(gymId: string | null) {
  const [classes, setClasses] = useState<GymClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClasses = useCallback(async () => {
    if (!gymId) {
      setClasses([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("gym_classes")
        .select("*")
        .eq("gym_id", gymId)
        .eq("is_active", true);

      if (error) throw error;
      setClasses((data || []) as GymClass[]);
    } catch (error) {
      console.error("Error fetching classes:", error);
    } finally {
      setIsLoading(false);
    }
  }, [gymId]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const createClass = async (classData: { name: string; description?: string; duration_minutes?: number; capacity?: number }) => {
    if (!gymId) return;

    try {
      const { error } = await supabase
        .from("gym_classes")
        .insert({
          gym_id: gymId,
          name: classData.name,
          description: classData.description,
          duration_minutes: classData.duration_minutes || 60,
          capacity: classData.capacity,
        });

      if (error) throw error;
      toast.success("Class created");
      fetchClasses();
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to create class");
    }
  };

  return { classes, isLoading, refetch: fetchClasses, createClass };
}

export function useClassSchedules(classId: string | null) {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    if (!classId) {
      setSchedules([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("class_schedules")
        .select("*")
        .eq("class_id", classId)
        .eq("is_active", true);

      if (error) throw error;
      setSchedules((data || []) as ClassSchedule[]);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return { schedules, isLoading, refetch: fetchSchedules };
}

export function useUserClassBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<ClassBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    if (!user) {
      setBookings([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("class_bookings")
        .select("*")
        .eq("user_id", user.id)
        .gte("booking_date", new Date().toISOString().split("T")[0]);

      if (error) throw error;
      setBookings((data || []) as ClassBooking[]);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const bookClass = async (scheduleId: string, bookingDate: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("class_bookings")
        .insert({
          schedule_id: scheduleId,
          user_id: user.id,
          booking_date: bookingDate,
        });

      if (error) throw error;
      toast.success("Class booked!");
      fetchBookings();
    } catch (error) {
      console.error("Error booking class:", error);
      toast.error("Failed to book class");
    }
  };

  const cancelBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from("class_bookings")
        .update({ status: "cancelled" })
        .eq("id", bookingId);

      if (error) throw error;
      toast.success("Booking cancelled");
      fetchBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking");
    }
  };

  return { bookings, isLoading, refetch: fetchBookings, bookClass, cancelBooking };
}

export function useOwnedGyms() {
  const { user } = useAuth();
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGyms = useCallback(async () => {
    if (!user) {
      setGyms([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .eq("owner_id", user.id);

      if (error) throw error;
      setGyms((data || []) as Gym[]);
    } catch (error) {
      console.error("Error fetching owned gyms:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  const createGym = async (gymData: { name: string; description?: string; address?: string; phone?: string; email?: string; website?: string }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("gyms")
        .insert({
          name: gymData.name,
          description: gymData.description,
          address: gymData.address,
          phone: gymData.phone,
          email: gymData.email,
          website: gymData.website,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success("Gym created!");
      fetchGyms();
      return data;
    } catch (error) {
      console.error("Error creating gym:", error);
      toast.error("Failed to create gym");
    }
  };

  const updateGym = async (gymId: string, updates: Partial<Gym>) => {
    try {
      const { error } = await supabase
        .from("gyms")
        .update(updates)
        .eq("id", gymId);

      if (error) throw error;
      toast.success("Gym updated");
      fetchGyms();
    } catch (error) {
      console.error("Error updating gym:", error);
      toast.error("Failed to update gym");
    }
  };

  return { gyms, isLoading, refetch: fetchGyms, createGym, updateGym };
}

export function useMembershipCheckins(membershipId: string | null) {
  const [checkins, setCheckins] = useState<{ id: string; checked_in_at: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCheckins = useCallback(async () => {
    if (!membershipId) {
      setCheckins([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("membership_checkins")
        .select("*")
        .eq("membership_id", membershipId)
        .order("checked_in_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setCheckins(data || []);
    } catch (error) {
      console.error("Error fetching checkins:", error);
    } finally {
      setIsLoading(false);
    }
  }, [membershipId]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const recordCheckin = async () => {
    if (!membershipId) return;

    try {
      const { error } = await supabase
        .from("membership_checkins")
        .insert({ membership_id: membershipId });

      if (error) throw error;
      toast.success("Checked in!");
      fetchCheckins();
    } catch (error) {
      console.error("Error recording checkin:", error);
      toast.error("Failed to check in");
    }
  };

  return { checkins, isLoading, refetch: fetchCheckins, recordCheckin };
}
