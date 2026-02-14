import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  category: string;
  is_enabled: boolean;
  is_critical: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  status: string;
  subject: string;
  preheader: string;
  html_content: string;
  editor_mode: string;
  design_json: any;
  variables_used: string[];
  created_by: string | null;
  created_at: string;
  published_at: string | null;
  notes: string | null;
  defaults_json: Record<string, string>;
  theme_json: EmailTheme;
  cta_defaults_json: CtaDefaults;
}

export interface EmailTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textPrimaryColor?: string;
  textSecondaryColor?: string;
  dividerColor?: string;
  buttonTextColor?: string;
  buttonRadius?: string;
  fontFamily?: string;
}

export interface CtaDefaults {
  ctaLabel?: string;
  ctaUrl?: string;
  secondaryCtaUrl?: string;
}

export const DEFAULT_THEME: EmailTheme = {
  primaryColor: "#6366f1",
  secondaryColor: "#8b5cf6",
  backgroundColor: "#f4f4f5",
  surfaceColor: "#ffffff",
  textPrimaryColor: "#374151",
  textSecondaryColor: "#6b7280",
  dividerColor: "#e5e7eb",
  buttonTextColor: "#ffffff",
  buttonRadius: "8px",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

export interface MergeTagDef {
  tag: string;
  description: string;
  sample: string;
  group: string;
}

// Complete merge tag library grouped by domain
export const MERGE_TAG_GROUPS: { label: string; key: string; tags: MergeTagDef[] }[] = [
  {
    label: "User / App",
    key: "common",
    tags: [
      { tag: "{{user.first_name}}", description: "User's first name", sample: "John", group: "common" },
      { tag: "{{user.last_name}}", description: "User's last name", sample: "Doe", group: "common" },
      { tag: "{{user.email}}", description: "User's email", sample: "john@example.com", group: "common" },
      { tag: "{{app.name}}", description: "App name", sample: "Flow Fitness", group: "common" },
      { tag: "{{app.support_email}}", description: "Support email", sample: "support@flowfitness.app", group: "common" },
    ],
  },
  {
    label: "Call-to-Action",
    key: "cta",
    tags: [
      { tag: "{{cta.url}}", description: "Primary CTA URL", sample: "https://flowfitness.app", group: "cta" },
      { tag: "{{cta.label}}", description: "CTA button text", sample: "View Details", group: "cta" },
      { tag: "{{cta.secondary_url}}", description: "Secondary CTA URL", sample: "https://flowfitness.app/help", group: "cta" },
    ],
  },
  {
    label: "Gym",
    key: "gym",
    tags: [
      { tag: "{{gym.name}}", description: "Gym name", sample: "Power Gym", group: "gym" },
      { tag: "{{gym.membership_number}}", description: "Membership number", sample: "PGM-202500123", group: "gym" },
      { tag: "{{gym.portal_link}}", description: "Gym portal link", sample: "https://flowfitness.app/gym-portal", group: "gym" },
      { tag: "{{gym.location}}", description: "Gym location/address", sample: "123 Fitness St, London", group: "gym" },
    ],
  },
  {
    label: "Coach",
    key: "coach",
    tags: [
      { tag: "{{coach.name}}", description: "Coach display name", sample: "Coach Sarah", group: "coach" },
      { tag: "{{coach.profile_link}}", description: "Coach profile link", sample: "https://flowfitness.app/find-coach", group: "coach" },
      { tag: "{{coach.portal_link}}", description: "Coach portal link", sample: "https://flowfitness.app/coach-portal", group: "coach" },
    ],
  },
  {
    label: "Run Club",
    key: "run_club",
    tags: [
      { tag: "{{run_club.name}}", description: "Run club name", sample: "Morning Runners", group: "run_club" },
      { tag: "{{run_club.location}}", description: "Run club location", sample: "Hyde Park, London", group: "run_club" },
      { tag: "{{run_club.link}}", description: "Run club link", sample: "https://flowfitness.app/run-clubs", group: "run_club" },
    ],
  },
  {
    label: "Events",
    key: "events",
    tags: [
      { tag: "{{event.name}}", description: "Event name", sample: "Summer CrossFit Games", group: "events" },
      { tag: "{{event.location}}", description: "Event location", sample: "Olympic Park, London", group: "events" },
      { tag: "{{event.start_date}}", description: "Event start date", sample: "15 March 2026", group: "events" },
      { tag: "{{event.link}}", description: "Event page link", sample: "https://flowfitness.app/events", group: "events" },
    ],
  },
  {
    label: "Invites",
    key: "invites",
    tags: [
      { tag: "{{invite.token_url}}", description: "Invite acceptance URL", sample: "https://flowfitness.app/accept-invite?token=abc123", group: "invites" },
      { tag: "{{invite.expires_at}}", description: "Invite expiry date", sample: "2026-02-21T00:00:00Z", group: "invites" },
      { tag: "{{org.name}}", description: "Organization name", sample: "Power Gym", group: "invites" },
    ],
  },
  {
    label: "Notifications",
    key: "notifications",
    tags: [
      { tag: "{{notification.title}}", description: "Notification title", sample: "New Message", group: "notifications" },
      { tag: "{{notification.body}}", description: "Notification body", sample: "You have a new message from your coach.", group: "notifications" },
      { tag: "{{notification.deep_link}}", description: "Deep link URL", sample: "https://flowfitness.app/inbox", group: "notifications" },
    ],
  },
  {
    label: "Rewards / Offers",
    key: "offers",
    tags: [
      { tag: "{{offer.title}}", description: "Offer title", sample: "20% Off Protein", group: "offers" },
      { tag: "{{offer.discount_code}}", description: "Discount code", sample: "SPRING20", group: "offers" },
      { tag: "{{offer.affiliate_url}}", description: "Affiliate/offer link", sample: "https://example.com/offer", group: "offers" },
      { tag: "{{product.name}}", description: "Product name", sample: "Whey Protein 1kg", group: "offers" },
      { tag: "{{discount.title}}", description: "Discount title (alias)", sample: "Spring Sale", group: "offers" },
    ],
  },
  {
    label: "Playlists / Media",
    key: "playlists",
    tags: [
      { tag: "{{playlist.name}}", description: "Playlist name", sample: "Beast Mode Beats", group: "playlists" },
      { tag: "{{playlist.provider}}", description: "Music provider", sample: "Spotify", group: "playlists" },
      { tag: "{{playlist.link}}", description: "Playlist link", sample: "https://open.spotify.com/playlist/abc", group: "playlists" },
    ],
  },
];

// Flat list of all tags for validation
export const ALL_MERGE_TAGS: MergeTagDef[] = MERGE_TAG_GROUPS.flatMap((g) => g.tags);

// Legacy compat
export const MERGE_TAGS = {
  common: MERGE_TAG_GROUPS.find((g) => g.key === "common")!.tags,
  invites: MERGE_TAG_GROUPS.find((g) => g.key === "invites")!.tags,
  notifications: MERGE_TAG_GROUPS.find((g) => g.key === "notifications")!.tags,
};

// Determine which tag groups are relevant for a template category
export function getRelevantGroups(category: string): string[] {
  const always = ["common", "cta"];
  const map: Record<string, string[]> = {
    invites: [...always, "invites", "gym", "coach", "run_club", "events"],
    notifications: [...always, "notifications", "gym", "coach", "run_club", "events", "offers", "playlists"],
    system: [...always, "notifications"],
  };
  return map[category] || always;
}

export const EMAIL_FONT_OPTIONS = [
  { value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", label: "System Default" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "'Trebuchet MS', Helvetica, sans-serif", label: "Trebuchet MS" },
  { value: "Verdana, Geneva, sans-serif", label: "Verdana" },
  { value: "'Courier New', Courier, monospace", label: "Courier New" },
  { value: "Tahoma, Geneva, sans-serif", label: "Tahoma" },
  { value: "'Lucida Sans', 'Lucida Grande', sans-serif", label: "Lucida Sans" },
];

export function useEmailTemplates() {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const useVersions = (templateId: string | null) =>
    useQuery({
      queryKey: ["email-template-versions", templateId],
      queryFn: async () => {
        if (!templateId) return [];
        const { data, error } = await supabase
          .from("email_template_versions")
          .select("*")
          .eq("template_id", templateId)
          .order("version_number", { ascending: false });
        if (error) throw error;
        return (data || []).map((v: any) => ({
          ...v,
          defaults_json: v.defaults_json || {},
          theme_json: v.theme_json || {},
          cta_defaults_json: v.cta_defaults_json || {},
        })) as EmailTemplateVersion[];
      },
      enabled: !!templateId,
    });

  const saveDraft = useMutation({
    mutationFn: async (params: {
      templateId: string;
      subject: string;
      preheader: string;
      html_content: string;
      editor_mode: string;
      design_json?: any;
      variables_used?: string[];
      notes?: string;
      defaults_json?: Record<string, string>;
      theme_json?: EmailTheme;
      cta_defaults_json?: CtaDefaults;
    }) => {
      const { data: existing } = await supabase
        .from("email_template_versions")
        .select("id, version_number")
        .eq("template_id", params.templateId)
        .eq("status", "draft")
        .maybeSingle();

      const payload: Record<string, any> = {
        subject: params.subject,
        preheader: params.preheader,
        html_content: params.html_content,
        editor_mode: params.editor_mode,
        design_json: params.design_json || [],
        variables_used: params.variables_used || [],
        notes: params.notes || null,
        defaults_json: params.defaults_json || {},
        theme_json: params.theme_json || {},
        cta_defaults_json: params.cta_defaults_json || {},
      };

      if (existing) {
        const { error } = await supabase
          .from("email_template_versions")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
        return existing;
      }

      const { data: latest } = await supabase
        .from("email_template_versions")
        .select("version_number")
        .eq("template_id", params.templateId)
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = (latest?.version_number || 0) + 1;
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("email_template_versions")
        .insert({
          template_id: params.templateId,
          version_number: nextVersion,
          status: "draft",
          ...payload,
          created_by: user?.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["email-template-versions", vars.templateId] });
      toast.success("Draft saved");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save draft"),
  });

  const publishVersion = useMutation({
    mutationFn: async ({ templateId, versionId }: { templateId: string; versionId: string }) => {
      await supabase
        .from("email_template_versions")
        .update({ status: "archived" })
        .eq("template_id", templateId)
        .eq("status", "published");

      const { error } = await supabase
        .from("email_template_versions")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["email-template-versions", vars.templateId] });
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template published!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to publish"),
  });

  const rollbackVersion = useMutation({
    mutationFn: async ({ templateId, versionId }: { templateId: string; versionId: string }) => {
      const { data: version, error: fetchErr } = await supabase
        .from("email_template_versions")
        .select("*")
        .eq("id", versionId)
        .single();
      if (fetchErr || !version) throw new Error("Version not found");

      await supabase
        .from("email_template_versions")
        .update({ status: "archived" })
        .eq("template_id", templateId)
        .eq("status", "published");

      const { error } = await supabase
        .from("email_template_versions")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", versionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["email-template-versions", vars.templateId] });
      toast.success("Rolled back successfully");
    },
    onError: (err: any) => toast.error(err.message || "Rollback failed"),
  });

  const updateTemplate = useMutation({
    mutationFn: async (params: { id: string; name?: string; category?: string; is_enabled?: boolean }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("email_templates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template updated");
    },
    onError: (err: any) => toast.error(err.message || "Update failed"),
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const newKey = `${template.template_key}_copy_${Date.now()}`;
      const { data, error } = await supabase
        .from("email_templates")
        .insert({
          template_key: newKey,
          name: `${template.name} (Copy)`,
          category: template.category,
          is_enabled: false,
          is_critical: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template duplicated");
    },
    onError: (err: any) => toast.error(err.message || "Duplicate failed"),
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    refetch: templatesQuery.refetch,
    useVersions,
    saveDraft,
    publishVersion,
    rollbackVersion,
    updateTemplate,
    duplicateTemplate,
  };
}
