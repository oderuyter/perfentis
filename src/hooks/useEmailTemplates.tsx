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
}

// Available merge tags by category
export const MERGE_TAGS = {
  common: [
    { tag: "{{user.first_name}}", description: "User's first name", sample: "John" },
    { tag: "{{user.last_name}}", description: "User's last name", sample: "Doe" },
    { tag: "{{user.email}}", description: "User's email", sample: "john@example.com" },
    { tag: "{{app.name}}", description: "App name", sample: "Flow Fitness" },
    { tag: "{{app.support_email}}", description: "Support email", sample: "support@flowfitness.app" },
    { tag: "{{cta.url}}", description: "Call-to-action URL", sample: "https://flowfitness.app" },
    { tag: "{{cta.label}}", description: "CTA button label", sample: "View Details" },
  ],
  invites: [
    { tag: "{{invite.token_url}}", description: "Invite acceptance URL", sample: "https://flowfitness.app/accept-invite?token=abc123" },
    { tag: "{{invite.expires_at}}", description: "Invite expiry date", sample: "2026-02-21T00:00:00Z" },
    { tag: "{{org.name}}", description: "Organization name", sample: "Power Gym" },
  ],
  notifications: [
    { tag: "{{notification.title}}", description: "Notification title", sample: "New Message" },
    { tag: "{{notification.body}}", description: "Notification body", sample: "You have a new message from your coach." },
    { tag: "{{notification.deep_link}}", description: "Deep link URL", sample: "https://flowfitness.app/inbox" },
  ],
};

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
        return data as EmailTemplateVersion[];
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
    }) => {
      // Check if there's an existing draft
      const { data: existing } = await supabase
        .from("email_template_versions")
        .select("id, version_number")
        .eq("template_id", params.templateId)
        .eq("status", "draft")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("email_template_versions")
          .update({
            subject: params.subject,
            preheader: params.preheader,
            html_content: params.html_content,
            editor_mode: params.editor_mode,
            design_json: params.design_json || [],
            variables_used: params.variables_used || [],
            notes: params.notes || null,
          })
          .eq("id", existing.id);
        if (error) throw error;
        return existing;
      }

      // Get next version number
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
          subject: params.subject,
          preheader: params.preheader,
          html_content: params.html_content,
          editor_mode: params.editor_mode,
          design_json: params.design_json || [],
          variables_used: params.variables_used || [],
          created_by: user?.user?.id || null,
          notes: params.notes || null,
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
      // Archive old published versions
      await supabase
        .from("email_template_versions")
        .update({ status: "archived" })
        .eq("template_id", templateId)
        .eq("status", "published");

      // Publish this version
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
      // Get the version to rollback to
      const { data: version, error: fetchErr } = await supabase
        .from("email_template_versions")
        .select("*")
        .eq("id", versionId)
        .single();
      if (fetchErr || !version) throw new Error("Version not found");

      // Archive current published
      await supabase
        .from("email_template_versions")
        .update({ status: "archived" })
        .eq("template_id", templateId)
        .eq("status", "published");

      // Re-publish the target version
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
