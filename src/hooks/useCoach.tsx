import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Coach {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  location: string | null;
  hourly_rate: number | null;
  delivery_type: string | null;
  is_public: boolean | null;
  is_online: boolean | null;
  created_at: string;
  updated_at: string;
}

export function useCoach() {
  const { user } = useAuth();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoach = useCallback(async () => {
    if (!user) {
      setCoach(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("coaches")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // No coach record found
          setCoach(null);
        } else {
          throw fetchError;
        }
      } else {
        setCoach(data as Coach);
      }
    } catch (err) {
      console.error("Error fetching coach:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch coach");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCoach();
  }, [fetchCoach]);

  const isCoach = !!coach;

  return {
    coach,
    isCoach,
    isLoading,
    error,
    refetch: fetchCoach,
  };
}

export function useCoachClients(coachId: string | undefined) {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async () => {
    if (!coachId) {
      setClients([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("coach_clients")
        .select(`
          *,
          profiles:client_user_id(display_name, avatar_url),
          service:service_id(name)
        `)
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, isLoading, refetch: fetchClients };
}

export function useCoachServices(coachId: string | undefined) {
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    if (!coachId) {
      setServices([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("coach_services")
        .select("*")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServices(data || []);
    } catch (err) {
      console.error("Error fetching services:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, isLoading, refetch: fetchServices };
}

export function useCoachInvitations(coachId: string | undefined) {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvitations = useCallback(async () => {
    if (!coachId) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("coach_invitations")
        .select(`
          *,
          service:service_id(name)
        `)
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (err) {
      console.error("Error fetching invitations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return { invitations, isLoading, refetch: fetchInvitations };
}

export function useTrainingPlans(coachId: string | undefined) {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!coachId) {
      setPlans([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("training_plans")
        .select(`
          *,
          plan_weeks(
            *,
            plan_workouts(*)
          )
        `)
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (err) {
      console.error("Error fetching plans:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, isLoading, refetch: fetchPlans };
}

export function useCoachAppointments(coachId: string | undefined) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    if (!coachId) {
      setAppointments([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("coach_appointments")
        .select(`
          *,
          client:client_id(
            id,
            profiles:client_user_id(display_name, avatar_url)
          )
        `)
        .eq("coach_id", coachId)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { appointments, isLoading, refetch: fetchAppointments };
}

export function useCoachFinancials(coachId: string | undefined) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFinancials = useCallback(async () => {
    if (!coachId) {
      setInvoices([]);
      setTransactions([]);
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    try {
      const [invoicesRes, transactionsRes, expensesRes] = await Promise.all([
        supabase
          .from("coach_invoices")
          .select(`
            *,
            client:client_id(
              profiles:client_user_id(display_name)
            ),
            service:service_id(name)
          `)
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false }),
        supabase
          .from("coach_transactions")
          .select("*")
          .eq("coach_id", coachId)
          .order("transaction_date", { ascending: false }),
        supabase
          .from("coach_expenses")
          .select("*")
          .eq("coach_id", coachId)
          .order("expense_date", { ascending: false }),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (expensesRes.error) throw expensesRes.error;

      setInvoices(invoicesRes.data || []);
      setTransactions(transactionsRes.data || []);
      setExpenses(expensesRes.data || []);
    } catch (err) {
      console.error("Error fetching financials:", err);
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  return { invoices, transactions, expenses, isLoading, refetch: fetchFinancials };
}
