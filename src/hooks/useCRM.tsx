import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { logAuditEvent } from "./useAuditLog";
import { createNotification } from "@/lib/notifications";

export type CRMContextType = 'gym' | 'coach' | 'event';

export interface PipelineStage {
  id: string;
  context_type: CRMContextType;
  context_id: string;
  stage_name: string;
  stage_order: number;
  is_default: boolean;
  is_won: boolean;
  is_lost: boolean;
}

export interface CRMLead {
  id: string;
  context_type: CRMContextType;
  context_id: string;
  lead_name: string;
  email: string | null;
  phone: string | null;
  user_id: string | null;
  is_registered_user: boolean;
  status: 'open' | 'won' | 'lost' | 'archived';
  stage_id: string | null;
  source: 'messaging' | 'form' | 'manual' | 'referral' | 'import';
  assigned_to_user_id: string | null;
  tags: string[];
  conversation_id: string | null;
  last_contacted_at: string | null;
  converted_at: string | null;
  is_incomplete: boolean;
  created_at: string;
  updated_at: string;
  // Contact snapshot
  contact_telephone: string | null;
  contact_instagram: string | null;
  contact_tiktok: string | null;
  contact_youtube: string | null;
  contact_twitter: string | null;
  contact_website: string | null;
  home_address_line1: string | null;
  home_address_line2: string | null;
  home_address_city: string | null;
  home_address_postcode: string | null;
  home_address_country: string | null;
  work_company: string | null;
  work_address_line1: string | null;
  work_address_line2: string | null;
  work_address_city: string | null;
  work_address_postcode: string | null;
  work_address_country: string | null;
  // Joined data
  stage?: PipelineStage;
  assignee?: { display_name: string | null; avatar_url: string | null };
  unread_count?: number;
  last_message?: string;
}

export interface CRMNote {
  id: string;
  lead_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  author?: { display_name: string | null; avatar_url: string | null };
}

export interface CRMTask {
  id: string;
  lead_id: string;
  task_type: 'call' | 'message' | 'follow-up' | 'meeting' | 'other';
  title: string;
  description: string | null;
  due_at: string | null;
  status: 'open' | 'done' | 'cancelled';
  assigned_to_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  assignee?: { display_name: string | null };
}

export interface CRMActivity {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: { display_name: string | null };
}

export interface CRMSettings {
  id: string;
  context_type: CRMContextType;
  context_id: string;
  auto_create_leads_from_messages: boolean;
  default_assignee_user_id: string | null;
}

export interface CRMTaskTemplate {
  id: string;
  context_type: CRMContextType;
  context_id: string;
  name: string;
  tasks: Array<{
    title: string;
    task_type: CRMTask['task_type'];
    description?: string;
    due_days_offset?: number; // days from template application
  }>;
  created_at: string;
  updated_at: string;
}

// Hook for pipeline stages
export function usePipelineStages(contextType: CRMContextType, contextId: string | null) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStages = useCallback(async () => {
    if (!contextId) {
      setStages([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("crm_pipeline_stages")
        .select("*")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .order("stage_order", { ascending: true });

      if (error) throw error;
      
      // Create default stages if none exist
      if (!data || data.length === 0) {
        const defaultStages = [
          { stage_name: "New Enquiry", stage_order: 0, is_default: true },
          { stage_name: "Contacted", stage_order: 1 },
          { stage_name: "Qualified", stage_order: 2 },
          { stage_name: "Proposal", stage_order: 3 },
          { stage_name: "Won", stage_order: 4, is_won: true },
          { stage_name: "Lost", stage_order: 5, is_lost: true },
        ];

        const { data: created, error: createError } = await supabase
          .from("crm_pipeline_stages")
          .insert(
            defaultStages.map(s => ({
              context_type: contextType,
              context_id: contextId,
              ...s,
            }))
          )
          .select();

        if (createError) throw createError;
        setStages((created || []) as PipelineStage[]);
      } else {
        setStages(data as PipelineStage[]);
      }
    } catch (error) {
      console.error("Error fetching pipeline stages:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contextType, contextId]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const createStage = async (stageName: string) => {
    if (!contextId) return;
    
    const maxOrder = Math.max(...stages.map(s => s.stage_order), -1);
    
    const { error } = await supabase
      .from("crm_pipeline_stages")
      .insert({
        context_type: contextType,
        context_id: contextId,
        stage_name: stageName,
        stage_order: maxOrder + 1,
      });

    if (error) throw error;
    await fetchStages();
  };

  const updateStage = async (stageId: string, updates: Partial<PipelineStage>) => {
    const { error } = await supabase
      .from("crm_pipeline_stages")
      .update(updates)
      .eq("id", stageId);

    if (error) throw error;
    await fetchStages();
  };

  const deleteStage = async (stageId: string) => {
    const { error } = await supabase
      .from("crm_pipeline_stages")
      .delete()
      .eq("id", stageId);

    if (error) throw error;
    await fetchStages();
  };

  const reorderStages = async (stageIds: string[]) => {
    const updates = stageIds.map((id, index) => 
      supabase
        .from("crm_pipeline_stages")
        .update({ stage_order: index })
        .eq("id", id)
    );
    
    await Promise.all(updates);
    await fetchStages();
  };

  return {
    stages,
    isLoading,
    createStage,
    updateStage,
    deleteStage,
    reorderStages,
    refetch: fetchStages,
  };
}

// Hook for CRM leads
export function useCRMLeads(contextType: CRMContextType, contextId: string | null) {
  const { user } = useAuth();
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!contextId) {
      setLeads([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .select(`
          *,
          stage:crm_pipeline_stages(*)
        `)
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get assignee profiles
      const assigneeIds = new Set<string>();
      data?.forEach(lead => {
        if (lead.assigned_to_user_id) assigneeIds.add(lead.assigned_to_user_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(assigneeIds));

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get unread counts for conversations
      const conversationIds = data?.filter(l => l.conversation_id).map(l => l.conversation_id) || [];
      
      let unreadCounts = new Map<string, number>();
      if (conversationIds.length > 0 && user) {
        const { data: messages } = await supabase
          .from("messages")
          .select("id, conversation_id")
          .in("conversation_id", conversationIds)
          .neq("sender_user_id", user.id);

        const { data: receipts } = await supabase
          .from("message_read_receipts")
          .select("message_id")
          .eq("user_id", user.id);

        const readIds = new Set(receipts?.map(r => r.message_id) || []);
        
        messages?.forEach(msg => {
          if (!readIds.has(msg.id)) {
            unreadCounts.set(msg.conversation_id, (unreadCounts.get(msg.conversation_id) || 0) + 1);
          }
        });
      }

      const transformed: CRMLead[] = (data || []).map(lead => ({
        ...lead,
        stage: lead.stage as PipelineStage | undefined,
        assignee: lead.assigned_to_user_id 
          ? profileMap.get(lead.assigned_to_user_id) 
          : undefined,
        unread_count: lead.conversation_id ? unreadCounts.get(lead.conversation_id) || 0 : 0,
      })) as CRMLead[];

      setLeads(transformed);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contextType, contextId, user]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Realtime subscription
  useEffect(() => {
    if (!contextId) return;

    const channel = supabase
      .channel(`crm-leads-${contextId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crm_leads',
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contextId, fetchLeads]);

  const createLead = async (leadData: {
    lead_name: string;
    email?: string;
    phone?: string;
    source?: 'form' | 'manual' | 'referral';
    stage_id?: string;
  }) => {
    if (!contextId || !user) return null;

    // Check for deduplication
    if (leadData.email) {
      const { data: existing } = await supabase
        .from("crm_leads")
        .select("id")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .eq("email", leadData.email)
        .maybeSingle();

      if (existing) {
        throw new Error("A lead with this email already exists");
      }
    }

    const { data, error } = await supabase
      .from("crm_leads")
      .insert({
        context_type: contextType,
        context_id: contextId,
        lead_name: leadData.lead_name,
        email: leadData.email || null,
        phone: leadData.phone || null,
        source: leadData.source || 'manual',
        stage_id: leadData.stage_id || null,
        is_incomplete: !leadData.email,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from("crm_lead_activities").insert({
      lead_id: data.id,
      activity_type: "lead_created",
      description: `Lead created manually by ${user.email}`,
      actor_user_id: user.id,
    });

    await logAuditEvent({
      action: "crm_lead_created",
      message: `Lead "${leadData.lead_name}" created`,
      category: "admin",
      entityType: "crm_lead",
      entityId: data.id,
    });

    await fetchLeads();
    return data.id;
  };

  const updateLead = async (leadId: string, updates: Partial<CRMLead>) => {
    if (!user) return;

    const { error } = await supabase
      .from("crm_leads")
      .update(updates)
      .eq("id", leadId);

    if (error) throw error;

    // Log stage change
    if (updates.stage_id) {
      await supabase.from("crm_lead_activities").insert({
        lead_id: leadId,
        activity_type: "stage_changed",
        description: "Stage updated",
        actor_user_id: user.id,
        metadata: { new_stage_id: updates.stage_id },
      });
    }

    // Log assignment change
    if (updates.assigned_to_user_id !== undefined) {
      await supabase.from("crm_lead_activities").insert({
        lead_id: leadId,
        activity_type: "assigned",
        description: updates.assigned_to_user_id 
          ? "Lead assigned to staff member" 
          : "Lead unassigned",
        actor_user_id: user.id,
        metadata: { assignee_id: updates.assigned_to_user_id },
      });

      // Notify assignee
      if (updates.assigned_to_user_id) {
        await createNotification({
          userId: updates.assigned_to_user_id,
          title: "Lead Assigned",
          body: "A new lead has been assigned to you",
          type: "system",
          entityType: "crm_lead",
          entityId: leadId,
        });
      }
    }

    await fetchLeads();
  };

  const moveToStage = async (leadId: string, stageId: string) => {
    await updateLead(leadId, { stage_id: stageId });
    
    await logAuditEvent({
      action: "crm_stage_changed",
      message: "Lead stage updated",
      category: "admin",
      entityType: "crm_lead",
      entityId: leadId,
      metadata: { new_stage_id: stageId },
    });
  };

  const assignLead = async (leadId: string, userId: string | null) => {
    await updateLead(leadId, { assigned_to_user_id: userId });
    
    await logAuditEvent({
      action: "crm_lead_assigned",
      message: userId ? "Lead assigned" : "Lead unassigned",
      category: "admin",
      entityType: "crm_lead",
      entityId: leadId,
      metadata: { assignee_id: userId },
    });
  };

  const convertLead = async (leadId: string, status: 'won' | 'lost') => {
    if (!user) return;

    await supabase
      .from("crm_leads")
      .update({ 
        status, 
        converted_at: status === 'won' ? new Date().toISOString() : null 
      })
      .eq("id", leadId);

    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: status === 'won' ? "converted" : "lost",
      description: status === 'won' ? "Lead converted to customer" : "Lead marked as lost",
      actor_user_id: user.id,
    });

    await logAuditEvent({
      action: status === 'won' ? "crm_lead_converted" : "crm_lead_lost",
      message: `Lead ${status}`,
      category: "admin",
      entityType: "crm_lead",
      entityId: leadId,
    });

    await fetchLeads();
  };

  return {
    leads,
    isLoading,
    createLead,
    updateLead,
    moveToStage,
    assignLead,
    convertLead,
    refetch: fetchLeads,
  };
}

// Hook for single lead detail
export function useCRMLeadDetail(leadId: string | null) {
  const { user } = useAuth();
  const [lead, setLead] = useState<CRMLead | null>(null);
  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [activities, setActivities] = useState<CRMActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLead = useCallback(async () => {
    if (!leadId) {
      setLead(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .select(`
          *,
          stage:crm_pipeline_stages(*)
        `)
        .eq("id", leadId)
        .single();

      if (error) throw error;
      setLead(data as unknown as CRMLead);
    } catch (error) {
      console.error("Error fetching lead:", error);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  const fetchNotes = useCallback(async () => {
    if (!leadId) return;

    const { data, error } = await supabase
      .from("crm_lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      return;
    }

    // Get author profiles
    const authorIds = new Set(data?.map(n => n.author_user_id) || []);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", Array.from(authorIds));

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setNotes((data || []).map(note => ({
      ...note,
      author: profileMap.get(note.author_user_id),
    })) as CRMNote[]);
  }, [leadId]);

  const fetchTasks = useCallback(async () => {
    if (!leadId) return;

    const { data, error } = await supabase
      .from("crm_tasks")
      .select("*")
      .eq("lead_id", leadId)
      .order("due_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }

    setTasks((data || []) as CRMTask[]);
  }, [leadId]);

  const fetchActivities = useCallback(async () => {
    if (!leadId) return;

    const { data, error } = await supabase
      .from("crm_lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching activities:", error);
      return;
    }

    // Get actor profiles
    const actorIds = new Set(data?.filter(a => a.actor_user_id).map(a => a.actor_user_id!) || []);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", Array.from(actorIds));

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    setActivities((data || []).map(activity => ({
      ...activity,
      actor: activity.actor_user_id ? profileMap.get(activity.actor_user_id) : undefined,
    })) as CRMActivity[]);
  }, [leadId]);

  useEffect(() => {
    fetchLead();
    fetchNotes();
    fetchTasks();
    fetchActivities();
  }, [fetchLead, fetchNotes, fetchTasks, fetchActivities]);

  const addNote = async (body: string) => {
    if (!leadId || !user) return;

    const { error } = await supabase
      .from("crm_lead_notes")
      .insert({
        lead_id: leadId,
        author_user_id: user.id,
        body,
      });

    if (error) throw error;

    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: "note_added",
      description: "Internal note added",
      actor_user_id: user.id,
    });

    await fetchNotes();
    await fetchActivities();
  };

  const createTask = async (taskData: {
    title: string;
    task_type: CRMTask['task_type'];
    description?: string;
    due_at?: string;
    assigned_to_user_id?: string;
  }) => {
    if (!leadId || !user) return;

    const { error } = await supabase
      .from("crm_tasks")
      .insert({
        lead_id: leadId,
        ...taskData,
      });

    if (error) throw error;

    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: "task_created",
      description: `Task "${taskData.title}" created`,
      actor_user_id: user.id,
    });

    // Notify assignee
    if (taskData.assigned_to_user_id && taskData.assigned_to_user_id !== user.id) {
      await createNotification({
        userId: taskData.assigned_to_user_id,
        title: "Task Assigned",
        body: taskData.title,
        type: "system",
        entityType: "crm_task",
        entityId: leadId,
      });
    }

    await fetchTasks();
    await fetchActivities();
  };

  const completeTask = async (taskId: string) => {
    if (!user) return;

    // Get task title for activity log
    const task = tasks.find(t => t.id === taskId);

    const { error } = await supabase
      .from("crm_tasks")
      .update({ 
        status: 'done', 
        completed_at: new Date().toISOString() 
      })
      .eq("id", taskId);

    if (error) throw error;

    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: "task_completed",
      description: `Task "${task?.title || 'Unknown'}" completed`,
      actor_user_id: user.id,
      metadata: { task_id: taskId },
    });

    await fetchTasks();
    await fetchActivities();
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;

    // Get task title for activity log
    const task = tasks.find(t => t.id === taskId);

    const { error } = await supabase
      .from("crm_tasks")
      .delete()
      .eq("id", taskId);

    if (error) throw error;

    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: "task_deleted",
      description: `Task "${task?.title || 'Unknown'}" deleted`,
      actor_user_id: user.id,
      metadata: { task_id: taskId },
    });

    await fetchTasks();
    await fetchActivities();
  };

  const applyTaskTemplate = async (template: CRMTaskTemplate) => {
    if (!leadId || !user) return;

    const now = new Date();
    const tasksToCreate = template.tasks.map(t => ({
      lead_id: leadId,
      title: t.title,
      task_type: t.task_type,
      description: t.description || null,
      due_at: t.due_days_offset 
        ? new Date(now.getTime() + t.due_days_offset * 24 * 60 * 60 * 1000).toISOString()
        : null,
    }));

    const { error } = await supabase
      .from("crm_tasks")
      .insert(tasksToCreate);

    if (error) throw error;

    await supabase.from("crm_lead_activities").insert({
      lead_id: leadId,
      activity_type: "template_applied",
      description: `Task template "${template.name}" applied (${template.tasks.length} tasks)`,
      actor_user_id: user.id,
      metadata: { template_id: template.id, template_name: template.name },
    });

    await fetchTasks();
    await fetchActivities();
  };

  return {
    lead,
    notes,
    tasks,
    activities,
    isLoading,
    addNote,
    createTask,
    completeTask,
    deleteTask,
    applyTaskTemplate,
    refetchLead: fetchLead,
    refetchNotes: fetchNotes,
    refetchTasks: fetchTasks,
    refetchActivities: fetchActivities,
  };
}

// Hook for CRM settings
export function useCRMSettings(contextType: CRMContextType, contextId: string | null) {
  const [settings, setSettings] = useState<CRMSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!contextId) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("crm_settings")
        .select("*")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default settings
        const { data: created, error: createError } = await supabase
          .from("crm_settings")
          .insert({
            context_type: contextType,
            context_id: contextId,
          })
          .select()
          .single();

        if (createError) throw createError;
        setSettings(created as CRMSettings);
      } else {
        setSettings(data as CRMSettings);
      }
    } catch (error) {
      console.error("Error fetching CRM settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contextType, contextId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<CRMSettings>) => {
    if (!settings) return;

    const { error } = await supabase
      .from("crm_settings")
      .update(updates)
      .eq("id", settings.id);

    if (error) throw error;

    setSettings(prev => prev ? { ...prev, ...updates } : null);
  };

  return {
    settings,
    isLoading,
    updateSettings,
    refetch: fetchSettings,
  };
}

// Hook for CRM reports/stats
export function useCRMStats(contextType: CRMContextType, contextId: string | null) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    openLeads: 0,
    wonLeads: 0,
    lostLeads: 0,
    leadsThisMonth: 0,
    conversionRate: 0,
    avgTimeToConvert: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!contextId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, status, created_at, converted_at")
        .eq("context_type", contextType)
        .eq("context_id", contextId);

      if (error) throw error;

      const leads = data || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const totalLeads = leads.length;
      const openLeads = leads.filter(l => l.status === 'open').length;
      const wonLeads = leads.filter(l => l.status === 'won').length;
      const lostLeads = leads.filter(l => l.status === 'lost').length;
      const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= startOfMonth).length;
      
      const closedLeads = wonLeads + lostLeads;
      const conversionRate = closedLeads > 0 ? (wonLeads / closedLeads) * 100 : 0;

      // Calculate average time to convert
      const convertedLeads = leads.filter(l => l.converted_at);
      const avgTimeToConvert = convertedLeads.length > 0
        ? convertedLeads.reduce((sum, l) => {
            const created = new Date(l.created_at).getTime();
            const converted = new Date(l.converted_at!).getTime();
            return sum + (converted - created);
          }, 0) / convertedLeads.length / (1000 * 60 * 60 * 24) // days
        : 0;

      setStats({
        totalLeads,
        openLeads,
        wonLeads,
        lostLeads,
        leadsThisMonth,
        conversionRate: Math.round(conversionRate),
        avgTimeToConvert: Math.round(avgTimeToConvert),
      });
    } catch (error) {
      console.error("Error fetching CRM stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contextType, contextId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, refetch: fetchStats };
}

// Hook for task templates
export function useCRMTaskTemplates(contextType: CRMContextType, contextId: string | null) {
  const [templates, setTemplates] = useState<CRMTaskTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!contextId) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("crm_task_templates")
        .select("*")
        .eq("context_type", contextType)
        .eq("context_id", contextId)
        .order("name", { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as CRMTaskTemplate[]);
    } catch (error) {
      console.error("Error fetching task templates:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contextType, contextId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const createTemplate = async (name: string, tasks: CRMTaskTemplate['tasks']) => {
    if (!contextId) return;

    const { error } = await supabase
      .from("crm_task_templates")
      .insert({
        context_type: contextType,
        context_id: contextId,
        name,
        tasks,
      });

    if (error) throw error;
    await fetchTemplates();
  };

  const updateTemplate = async (templateId: string, updates: { name?: string; tasks?: CRMTaskTemplate['tasks'] }) => {
    const { error } = await supabase
      .from("crm_task_templates")
      .update(updates)
      .eq("id", templateId);

    if (error) throw error;
    await fetchTemplates();
  };

  const deleteTemplate = async (templateId: string) => {
    const { error } = await supabase
      .from("crm_task_templates")
      .delete()
      .eq("id", templateId);

    if (error) throw error;
    await fetchTemplates();
  };

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
  };
}
