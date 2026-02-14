import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft, Save, Send, Eye, Code, Paintbrush, Monitor, Smartphone,
  Loader2, Upload, History, RotateCcw, Tag, AlertTriangle, CheckCircle, Info,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Palette, Link2, Type,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useEmailTemplates, MERGE_TAG_GROUPS, ALL_MERGE_TAGS, getRelevantGroups,
  EMAIL_FONT_OPTIONS, DEFAULT_THEME,
  type EmailTemplate, type EmailTemplateVersion, type EmailTheme, type CtaDefaults,
} from "@/hooks/useEmailTemplates";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function AdminEmailTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { saveDraft, publishVersion, rollbackVersion } = useEmailTemplates();

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ["email-template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates").select("*").eq("id", templateId!).single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    enabled: !!templateId,
  });

  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ["email-template-versions", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_template_versions").select("*").eq("template_id", templateId!)
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

  const publishedVersion = versions.find((v) => v.status === "published");
  const draftVersion = versions.find((v) => v.status === "draft");

  // Editor state
  const [editorMode, setEditorMode] = useState<"html" | "wysiwyg">("html");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [designJson, setDesignJson] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeTab, setActiveTab] = useState("editor");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<EmailTheme>({ ...DEFAULT_THEME });
  const [ctaDefaults, setCtaDefaults] = useState<CtaDefaults>({});

  useEffect(() => {
    const source = draftVersion || publishedVersion;
    if (source) {
      setSubject(source.subject);
      setPreheader(source.preheader || "");
      setHtmlContent(source.html_content);
      setEditorMode(source.editor_mode as "html" | "wysiwyg");
      setDesignJson(Array.isArray(source.design_json) ? source.design_json : []);
      setDefaults(source.defaults_json || {});
      setTheme({ ...DEFAULT_THEME, ...(source.theme_json || {}) });
      setCtaDefaults(source.cta_defaults_json || {});
    }
  }, [draftVersion, publishedVersion]);

  // Get relevant tags for this template's category
  const relevantGroupKeys = useMemo(
    () => (template ? getRelevantGroups(template.category) : ["common", "cta"]),
    [template]
  );
  const availableGroups = useMemo(
    () => MERGE_TAG_GROUPS.filter((g) => relevantGroupKeys.includes(g.key)),
    [relevantGroupKeys]
  );
  const availableTags = useMemo(() => availableGroups.flatMap((g) => g.tags), [availableGroups]);

  // Detect used variables
  const detectedVariables = useMemo(() => {
    const combined = `${subject} ${preheader} ${htmlContent}`;
    const matches = combined.match(/\{\{[^}]+\}\}/g) || [];
    return [...new Set(matches)];
  }, [subject, preheader, htmlContent]);

  // Validate
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!subject.trim()) warnings.push("Subject line is empty");
    if (!htmlContent.trim()) warnings.push("HTML content is empty");
    const allKnown = ALL_MERGE_TAGS.map((t) => t.tag);
    const availableTagStrings = availableTags.map((t) => t.tag);
    detectedVariables.forEach((v) => {
      if (!allKnown.includes(v)) {
        warnings.push(`Unknown variable: ${v}`);
      } else if (!availableTagStrings.includes(v)) {
        warnings.push(`Variable ${v} is not typically available for this template type`);
      }
    });
    return warnings;
  }, [subject, htmlContent, detectedVariables, availableTags, defaults]);

  // Unresolved tags (not provided by sample and no default)
  const unresolvedTags = useMemo(() => {
    return detectedVariables.filter((v) => {
      const key = v.replace(/\{\{|\}\}/g, "");
      const tagDef = ALL_MERGE_TAGS.find((t) => t.tag === v);
      return !tagDef && !defaults[key];
    });
  }, [detectedVariables, defaults]);

  const getSavePayload = () => ({
    templateId: templateId!,
    subject,
    preheader,
    html_content: htmlContent,
    editor_mode: editorMode,
    design_json: designJson,
    variables_used: detectedVariables,
    notes,
    defaults_json: defaults,
    theme_json: theme,
    cta_defaults_json: ctaDefaults,
  });

  const handleSaveDraft = async () => {
    if (!templateId) return;
    saveDraft.mutate(getSavePayload(), { onSuccess: () => refetchVersions() });
  };

  const handlePublish = async () => {
    if (!draftVersion && !publishedVersion) {
      toast.error("Save a draft first before publishing");
      return;
    }
    if (draftVersion) {
      await saveDraft.mutateAsync(getSavePayload());
    }
    const vId = draftVersion?.id || publishedVersion?.id;
    if (!vId || !templateId) return;
    publishVersion.mutate({ templateId, versionId: vId }, { onSuccess: () => refetchVersions() });
  };

  const handleTestSend = async () => {
    if (!testEmail || !template) return;
    setSending(true);
    try {
      // Build sample data from all tags + defaults
      const sampleData: Record<string, any> = { appUrl: window.location.origin };
      ALL_MERGE_TAGS.forEach((t) => {
        const key = t.tag.replace(/\{\{|\}\}/g, "");
        sampleData[key] = defaults[key] || t.sample;
      });
      // Apply CTA defaults
      if (ctaDefaults.ctaLabel) sampleData["cta.label"] = ctaDefaults.ctaLabel;
      if (ctaDefaults.ctaUrl) sampleData["cta.url"] = ctaDefaults.ctaUrl;
      if (ctaDefaults.secondaryCtaUrl) sampleData["cta.secondary_url"] = ctaDefaults.secondaryCtaUrl;

      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: testEmail,
          template: template.template_key,
          data: sampleData,
          subject: `[TEST] ${subject}`,
        },
      });
      if (error) throw error;
      if (data?.success) toast.success("Test email sent!");
      else toast.error(data?.error || "Send failed");
    } catch (err: any) {
      toast.error(err.message || "Failed to send test");
    } finally {
      setSending(false);
    }
  };

  // Preview with merge tags resolved using samples + defaults
  const renderPreviewHtml = useMemo(() => {
    let html = htmlContent;
    // First apply defaults, then samples
    ALL_MERGE_TAGS.forEach(({ tag, sample }) => {
      const key = tag.replace(/\{\{|\}\}/g, "");
      const value = defaults[key] || sample;
      html = html.replace(new RegExp(tag.replace(/[{}]/g, "\\$&"), "g"), value);
    });
    // CTA defaults
    if (ctaDefaults.ctaLabel) html = html.replace(/\{\{cta\.label\}\}/g, ctaDefaults.ctaLabel);
    if (ctaDefaults.ctaUrl) html = html.replace(/\{\{cta\.url\}\}/g, ctaDefaults.ctaUrl);
    // Highlight any remaining unresolved tags
    html = html.replace(
      /\{\{([^}]+)\}\}/g,
      '<span style="background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:3px;font-size:12px;">⚠ {{$1}}</span>'
    );
    return html;
  }, [htmlContent, defaults, ctaDefaults]);

  if (templateLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!template) {
    return <div className="text-center py-20 text-muted-foreground">Template not found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin-portal/email-templates")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{template.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{template.template_key}</p>
        </div>
        <div className="flex items-center gap-2">
          {draftVersion && <Badge variant="outline" className="text-amber-600 border-amber-300">Draft</Badge>}
          {publishedVersion && <Badge variant="outline" className="text-green-600 border-green-300">v{publishedVersion.version_number} Published</Badge>}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="defaults">Defaults & CTA</TabsTrigger>
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="test">Test Send</TabsTrigger>
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
        </TabsList>

        {/* ===== EDITOR TAB ===== */}
        <TabsContent value="editor" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              {/* Subject & Preheader */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label>Subject Line</Label>
                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject (supports {{variables}})" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preheader</Label>
                    <Input value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Preview text shown in inbox" />
                  </div>
                </CardContent>
              </Card>

              {/* Editor Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button variant={editorMode === "wysiwyg" ? "default" : "outline"} size="sm" onClick={() => setEditorMode("wysiwyg")}>
                  <Paintbrush className="h-4 w-4 mr-1" /> WYSIWYG
                </Button>
                <Button variant={editorMode === "html" ? "default" : "outline"} size="sm" onClick={() => setEditorMode("html")}>
                  <Code className="h-4 w-4 mr-1" /> HTML
                </Button>
                {editorMode === "wysiwyg" && (
                  <span className="text-xs text-muted-foreground ml-2">Block editor — complex HTML may not round-trip perfectly</span>
                )}
              </div>

              {editorMode === "html" ? (
                <Card>
                  <CardContent className="p-0">
                    <Textarea
                      value={htmlContent}
                      onChange={(e) => setHtmlContent(e.target.value)}
                      placeholder="<!DOCTYPE html>..."
                      className="font-mono text-sm min-h-[500px] rounded-none border-0 focus-visible:ring-0 resize-y"
                    />
                  </CardContent>
                </Card>
              ) : (
                <WysiwygEditor
                  blocks={designJson}
                  theme={theme}
                  onChange={(blocks, html) => { setDesignJson(blocks); setHtmlContent(html); }}
                />
              )}

              {/* Validation */}
              {validationWarnings.length > 0 && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Validation Warnings</p>
                        {validationWarnings.map((w, i) => (
                          <p key={i} className="text-xs text-amber-600 dark:text-amber-400">• {w}</p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Version Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed in this version?" />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveDraft} disabled={saveDraft.isPending} variant="outline">
                  {saveDraft.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Draft
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button disabled={publishVersion.isPending}>
                      {publishVersion.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Publish
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Publish Template?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {template.is_critical && "⚠️ This is a critical system template. "}
                        Publishing will make this version live for all outgoing emails.
                        {validationWarnings.length > 0 && ` There are ${validationWarnings.length} warning(s).`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePublish}>Publish Now</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Merge Tags Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Tag className="h-4 w-4" /> Merge Tags</CardTitle>
                  <CardDescription className="text-xs">Click to copy. Grouped by domain.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[500px]">
                    <Accordion type="multiple" defaultValue={relevantGroupKeys} className="px-3 pb-3">
                      {availableGroups.map((group) => (
                        <AccordionItem key={group.key} value={group.key} className="border-b-0">
                          <AccordionTrigger className="py-2 text-xs font-semibold uppercase text-muted-foreground hover:no-underline">
                            {group.label}
                          </AccordionTrigger>
                          <AccordionContent className="pb-1">
                            <div className="space-y-0.5">
                              {group.tags.map((t) => {
                                const isUsed = detectedVariables.includes(t.tag);
                                return (
                                  <button
                                    key={t.tag}
                                    onClick={() => { navigator.clipboard.writeText(t.tag); toast.success(`Copied ${t.tag}`); }}
                                    className={`w-full text-left p-1.5 rounded text-xs transition-colors ${isUsed ? "bg-primary/10" : "hover:bg-muted"}`}
                                  >
                                    <div className="flex items-center gap-1">
                                      <span className="font-mono text-primary">{t.tag}</span>
                                      {isUsed && <CheckCircle className="h-3 w-3 text-green-600" />}
                                    </div>
                                    <p className="text-muted-foreground mt-0.5">{t.description}</p>
                                  </button>
                                );
                              })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detected ({detectedVariables.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {detectedVariables.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {detectedVariables.map((v) => {
                        const known = ALL_MERGE_TAGS.find((t) => t.tag === v);
                        return (
                          <Badge key={v} variant={known ? "secondary" : "destructive"} className="text-xs font-mono">
                            {v}
                          </Badge>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No variables detected</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ===== DEFAULTS & CTA TAB ===== */}
        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CTA Link Overrides</CardTitle>
              <CardDescription>Default call-to-action values. Runtime sends can still override these.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default CTA Label</Label>
                  <Input value={ctaDefaults.ctaLabel || ""} onChange={(e) => setCtaDefaults({ ...ctaDefaults, ctaLabel: e.target.value })} placeholder="e.g. View Details" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default CTA URL</Label>
                  <Input value={ctaDefaults.ctaUrl || ""} onChange={(e) => setCtaDefaults({ ...ctaDefaults, ctaUrl: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Secondary CTA URL (optional)</Label>
                <Input value={ctaDefaults.secondaryCtaUrl || ""} onChange={(e) => setCtaDefaults({ ...ctaDefaults, secondaryCtaUrl: e.target.value })} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Merge Tag Default Values</CardTitle>
              <CardDescription>Fallback values used when runtime context doesn't provide a value. Leave blank to use system sample data.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {availableGroups.flatMap((g) => g.tags).map((t) => {
                  const key = t.tag.replace(/\{\{|\}\}/g, "");
                  return (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs font-mono text-muted-foreground">{t.tag}</Label>
                      <Input
                        value={defaults[key] || ""}
                        onChange={(e) => setDefaults({ ...defaults, [key]: e.target.value })}
                        placeholder={t.sample}
                        className="h-9 text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button onClick={handleSaveDraft} disabled={saveDraft.isPending} variant="outline">
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
          </div>
        </TabsContent>

        {/* ===== THEME TAB ===== */}
        <TabsContent value="theme" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Email Theme</CardTitle>
              <CardDescription>Configure colours and styles for this template. These apply to WYSIWYG blocks and are embedded in the generated HTML.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ColorField label="Primary / Button Color" value={theme.primaryColor || ""} onChange={(v) => setTheme({ ...theme, primaryColor: v })} />
                <ColorField label="Secondary / Accent" value={theme.secondaryColor || ""} onChange={(v) => setTheme({ ...theme, secondaryColor: v })} />
                <ColorField label="Background" value={theme.backgroundColor || ""} onChange={(v) => setTheme({ ...theme, backgroundColor: v })} />
                <ColorField label="Surface / Card" value={theme.surfaceColor || ""} onChange={(v) => setTheme({ ...theme, surfaceColor: v })} />
                <ColorField label="Text Primary" value={theme.textPrimaryColor || ""} onChange={(v) => setTheme({ ...theme, textPrimaryColor: v })} />
                <ColorField label="Text Secondary" value={theme.textSecondaryColor || ""} onChange={(v) => setTheme({ ...theme, textSecondaryColor: v })} />
                <ColorField label="Divider / Border" value={theme.dividerColor || ""} onChange={(v) => setTheme({ ...theme, dividerColor: v })} />
                <ColorField label="Button Text" value={theme.buttonTextColor || ""} onChange={(v) => setTheme({ ...theme, buttonTextColor: v })} />
              </div>
              <Separator className="my-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Button Radius</Label>
                  <Select value={theme.buttonRadius || "8px"} onValueChange={(v) => setTheme({ ...theme, buttonRadius: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0px">Square (0px)</SelectItem>
                      <SelectItem value="4px">Slight (4px)</SelectItem>
                      <SelectItem value="8px">Rounded (8px)</SelectItem>
                      <SelectItem value="20px">Pill (20px)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default Font</Label>
                  <Select value={theme.fontFamily || EMAIL_FONT_OPTIONS[0].value} onValueChange={(v) => setTheme({ ...theme, fontFamily: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMAIL_FONT_OPTIONS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Live preview swatch */}
              <div className="mt-4 rounded-lg overflow-hidden border" style={{ backgroundColor: theme.backgroundColor }}>
                <div className="p-4" style={{ backgroundColor: theme.surfaceColor }}>
                  <p style={{ color: theme.textPrimaryColor, fontFamily: theme.fontFamily, fontSize: 14, marginBottom: 8 }}>
                    Preview text in your theme colors
                  </p>
                  <p style={{ color: theme.textSecondaryColor, fontFamily: theme.fontFamily, fontSize: 12, marginBottom: 12 }}>
                    Secondary text example
                  </p>
                  <div style={{
                    display: "inline-block", background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
                    color: theme.buttonTextColor, padding: "8px 20px", borderRadius: theme.buttonRadius,
                    fontSize: 13, fontWeight: 600, fontFamily: theme.fontFamily,
                  }}>
                    Button Preview
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2">
            <Button onClick={handleSaveDraft} disabled={saveDraft.isPending} variant="outline">
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTheme({ ...DEFAULT_THEME })}>
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* ===== PREVIEW TAB ===== */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button variant={previewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("desktop")}>
              <Monitor className="h-4 w-4 mr-1" /> Desktop
            </Button>
            <Button variant={previewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("mobile")}>
              <Smartphone className="h-4 w-4 mr-1" /> Mobile
            </Button>
          </div>

          {unresolvedTags.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Unresolved tags highlighted in preview: {unresolvedTags.join(", ")}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-4">
              <div className="mb-3 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {subject || "(empty)"}</p>
                {preheader && <p className="text-sm"><span className="text-muted-foreground">Preheader:</span> {preheader}</p>}
              </div>
              <Separator className="mb-4" />
              <div className="flex justify-center">
                <div className="border rounded-lg overflow-hidden bg-white" style={{ width: previewMode === "mobile" ? 375 : "100%", maxWidth: "100%" }}>
                  <iframe
                    srcDoc={renderPreviewHtml || "<p style='padding:20px;color:#999'>No content to preview</p>"}
                    title="Email Preview"
                    className="w-full border-0"
                    style={{ minHeight: 500 }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TEST SEND TAB ===== */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Send Test Email</CardTitle>
              <CardDescription>Sends using sample + default merge tag values via your real email provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Recipient Email</Label>
                <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Result will be logged in Email Logs.</span>
              </div>
              <Button onClick={handleTestSend} disabled={sending || !testEmail}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== VERSIONS TAB ===== */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No versions yet.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg">v{v.version_number}</p>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={v.status === "published" ? "default" : v.status === "draft" ? "secondary" : "outline"}>
                              {v.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(v.created_at), "PPp")}</span>
                          </div>
                          {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{v.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {v.status === "archived" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm"><RotateCcw className="h-3.5 w-3.5 mr-1" /> Rollback</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rollback to v{v.version_number}?</AlertDialogTitle>
                                <AlertDialogDescription>This will make v{v.version_number} the active published version.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => rollbackVersion.mutate({ templateId: templateId!, versionId: v.id })}>
                                  Rollback
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSubject(v.subject); setPreheader(v.preheader || "");
                          setHtmlContent(v.html_content); setEditorMode(v.editor_mode as "html" | "wysiwyg");
                          setDefaults(v.defaults_json || {}); setTheme({ ...DEFAULT_THEME, ...(v.theme_json || {}) });
                          setCtaDefaults(v.cta_defaults_json || {}); setActiveTab("editor");
                          toast.success(`Loaded v${v.version_number} into editor`);
                        }}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Load
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// Color field helper
// ==========================================
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 rounded border cursor-pointer p-0.5"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-sm font-mono" placeholder="#000000" />
      </div>
    </div>
  );
}

// ==========================================
// WYSIWYG Block Editor with Typography
// ==========================================
interface Block {
  id: string;
  type: "text" | "image" | "button" | "divider" | "spacer" | "columns";
  content: string;
  props?: Record<string, any>;
  style?: BlockStyle;
}

interface BlockStyle {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  color?: string;
  lineHeight?: string;
}

function WysiwygEditor({ blocks, theme, onChange }: { blocks: any[]; theme: EmailTheme; onChange: (blocks: Block[], html: string) => void }) {
  const [items, setItems] = useState<Block[]>(
    Array.isArray(blocks) && blocks.length > 0
      ? blocks
      : [{ id: crypto.randomUUID(), type: "text", content: "<p>Start editing your email content here...</p>", style: {} }]
  );

  const updateItems = (newItems: Block[]) => {
    setItems(newItems);
    onChange(newItems, blocksToHtml(newItems, theme));
  };

  const addBlock = (type: Block["type"]) => {
    const defs: Record<string, Partial<Block>> = {
      text: { content: "<p>New text block</p>", style: {} },
      image: { content: "", props: { src: "https://via.placeholder.com/600x200", alt: "Image" } },
      button: { content: "Click Here", props: { url: "#" }, style: {} },
      divider: { content: "" },
      spacer: { content: "", props: { height: 24 } },
      columns: { content: "", props: { left: "<p>Left column</p>", right: "<p>Right column</p>" } },
    };
    updateItems([...items, { id: crypto.randomUUID(), type, ...defs[type] } as Block]);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    updateItems(items.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const updateBlockStyle = (id: string, styleUpdates: Partial<BlockStyle>) => {
    const block = items.find((b) => b.id === id);
    if (!block) return;
    updateBlock(id, { style: { ...block.style, ...styleUpdates } });
  };

  const removeBlock = (id: string) => updateItems(items.filter((b) => b.id !== id));

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((b) => b.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === items.length - 1)) return;
    const n = [...items];
    [n[idx], n[idx + dir]] = [n[idx + dir], n[idx]];
    updateItems(n);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(["text", "image", "button", "divider", "spacer", "columns"] as const).map((type) => (
          <Button key={type} variant="outline" size="sm" onClick={() => addBlock(type)} className="capitalize">+ {type}</Button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((block, idx) => (
          <Card key={block.id} className="relative group">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveBlock(block.id, -1)} disabled={idx === 0}>↑</Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveBlock(block.id, 1)} disabled={idx === items.length - 1}>↓</Button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs capitalize">{block.type}</Badge>
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive ml-auto" onClick={() => removeBlock(block.id)}>Remove</Button>
                  </div>

                  {/* Typography toolbar for text & button blocks */}
                  {(block.type === "text" || block.type === "button") && (
                    <TypographyToolbar
                      style={block.style || {}}
                      onChange={(s) => updateBlockStyle(block.id, s)}
                      theme={theme}
                    />
                  )}

                  {block.type === "text" && (
                    <Textarea
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      className="font-mono text-xs min-h-[80px]"
                      placeholder="<p>Your HTML content...</p>"
                    />
                  )}
                  {block.type === "image" && (
                    <div className="space-y-2">
                      <Input value={block.props?.src || ""} onChange={(e) => updateBlock(block.id, { props: { ...block.props, src: e.target.value } })} placeholder="Image URL" />
                      <Input value={block.props?.alt || ""} onChange={(e) => updateBlock(block.id, { props: { ...block.props, alt: e.target.value } })} placeholder="Alt text" />
                    </div>
                  )}
                  {block.type === "button" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} placeholder="Button label" />
                      <Input value={block.props?.url || ""} onChange={(e) => updateBlock(block.id, { props: { ...block.props, url: e.target.value } })} placeholder="URL" />
                    </div>
                  )}
                  {block.type === "divider" && <hr className="my-2" />}
                  {block.type === "spacer" && (
                    <Input type="number" value={block.props?.height || 24} onChange={(e) => updateBlock(block.id, { props: { ...block.props, height: parseInt(e.target.value) || 24 } })} className="w-24" min={8} max={120} />
                  )}
                  {block.type === "columns" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Textarea value={block.props?.left || ""} onChange={(e) => updateBlock(block.id, { props: { ...block.props, left: e.target.value } })} placeholder="Left column HTML" className="font-mono text-xs min-h-[60px]" />
                      <Textarea value={block.props?.right || ""} onChange={(e) => updateBlock(block.id, { props: { ...block.props, right: e.target.value } })} placeholder="Right column HTML" className="font-mono text-xs min-h-[60px]" />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Typography Toolbar
// ==========================================
function TypographyToolbar({ style, onChange, theme }: { style: BlockStyle; onChange: (s: Partial<BlockStyle>) => void; theme: EmailTheme }) {
  return (
    <div className="flex flex-wrap items-center gap-1 mb-2 p-1.5 rounded-lg bg-muted/50 border">
      {/* Font family */}
      <Select value={style.fontFamily || theme.fontFamily || EMAIL_FONT_OPTIONS[0].value} onValueChange={(v) => onChange({ fontFamily: v })}>
        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {EMAIL_FONT_OPTIONS.map((f) => (
            <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font size */}
      <Select value={style.fontSize || "16px"} onValueChange={(v) => onChange({ fontSize: v })}>
        <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["10px", "12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px", "36px"].map((s) => (
            <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font weight */}
      <Select value={style.fontWeight || "400"} onValueChange={(v) => onChange({ fontWeight: v })}>
        <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="300" className="text-xs">Light</SelectItem>
          <SelectItem value="400" className="text-xs">Regular</SelectItem>
          <SelectItem value="500" className="text-xs">Medium</SelectItem>
          <SelectItem value="600" className="text-xs">Semi Bold</SelectItem>
          <SelectItem value="700" className="text-xs">Bold</SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Bold / Italic / Underline toggles */}
      <Button
        variant={style.fontWeight === "700" ? "default" : "ghost"}
        size="icon" className="h-7 w-7"
        onClick={() => onChange({ fontWeight: style.fontWeight === "700" ? "400" : "700" })}
      ><Bold className="h-3.5 w-3.5" /></Button>
      <Button
        variant={style.fontStyle === "italic" ? "default" : "ghost"}
        size="icon" className="h-7 w-7"
        onClick={() => onChange({ fontStyle: style.fontStyle === "italic" ? "normal" : "italic" })}
      ><Italic className="h-3.5 w-3.5" /></Button>
      <Button
        variant={style.textDecoration === "underline" ? "default" : "ghost"}
        size="icon" className="h-7 w-7"
        onClick={() => onChange({ textDecoration: style.textDecoration === "underline" ? "none" : "underline" })}
      ><Underline className="h-3.5 w-3.5" /></Button>

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Alignment */}
      {(["left", "center", "right", "justify"] as const).map((align) => {
        const Icon = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify }[align];
        return (
          <Button
            key={align}
            variant={(style.textAlign || "left") === align ? "default" : "ghost"}
            size="icon" className="h-7 w-7"
            onClick={() => onChange({ textAlign: align })}
          ><Icon className="h-3.5 w-3.5" /></Button>
        );
      })}

      <Separator orientation="vertical" className="h-5 mx-0.5" />

      {/* Text color */}
      <div className="flex items-center gap-1">
        <Type className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="color"
          value={style.color || theme.textPrimaryColor || "#374151"}
          onChange={(e) => onChange({ color: e.target.value })}
          className="h-6 w-6 rounded cursor-pointer border-0 p-0"
        />
      </div>

      {/* Line height */}
      <Select value={style.lineHeight || "1.6"} onValueChange={(v) => onChange({ lineHeight: v })}>
        <SelectTrigger className="h-7 w-14 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {["1.0", "1.2", "1.4", "1.6", "1.8", "2.0"].map((lh) => (
            <SelectItem key={lh} value={lh} className="text-xs">{lh}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ==========================================
// Blocks → HTML with theme support
// ==========================================
function buildInlineStyle(style?: BlockStyle): string {
  if (!style) return "";
  const parts: string[] = [];
  if (style.fontFamily) parts.push(`font-family:${style.fontFamily}`);
  if (style.fontSize) parts.push(`font-size:${style.fontSize}`);
  if (style.fontWeight) parts.push(`font-weight:${style.fontWeight}`);
  if (style.fontStyle) parts.push(`font-style:${style.fontStyle}`);
  if (style.textDecoration) parts.push(`text-decoration:${style.textDecoration}`);
  if (style.textAlign) parts.push(`text-align:${style.textAlign}`);
  if (style.color) parts.push(`color:${style.color}`);
  if (style.lineHeight) parts.push(`line-height:${style.lineHeight}`);
  return parts.join(";");
}

function blocksToHtml(blocks: Block[], theme: EmailTheme): string {
  const t = { ...DEFAULT_THEME, ...theme };
  const body = blocks.map((b) => {
    const inlineStyle = buildInlineStyle(b.style);
    switch (b.type) {
      case "text":
        return `<div style="${inlineStyle}">${b.content}</div>`;
      case "image":
        return `<img src="${b.props?.src || ""}" alt="${b.props?.alt || ""}" style="max-width:100%;height:auto;display:block;margin:0 auto;" />`;
      case "button": {
        const btnStyle = [
          `display:inline-block`,
          `background:linear-gradient(135deg, ${t.primaryColor} 0%, ${t.secondaryColor} 100%)`,
          `color:${t.buttonTextColor}`,
          `text-decoration:none`,
          `padding:12px 24px`,
          `border-radius:${t.buttonRadius}`,
          `font-weight:600`,
          `font-size:${b.style?.fontSize || "14px"}`,
          b.style?.fontFamily ? `font-family:${b.style.fontFamily}` : "",
        ].filter(Boolean).join(";");
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;${b.style?.textAlign === "center" ? "width:100%;" : ""}"><tr><td${b.style?.textAlign ? ` align="${b.style.textAlign}"` : ""}><a href="${b.props?.url || "#"}" style="${btnStyle}">${b.content}</a></td></tr></table>`;
      }
      case "divider":
        return `<hr style="border:none;border-top:1px solid ${t.dividerColor};margin:16px 0;" />`;
      case "spacer":
        return `<div style="height:${b.props?.height || 24}px;"></div>`;
      case "columns":
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" valign="top" style="padding-right:8px;">${b.props?.left || ""}</td><td width="50%" valign="top" style="padding-left:8px;">${b.props?.right || ""}</td></tr></table>`;
      default:
        return "";
    }
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:${t.fontFamily};background-color:${t.backgroundColor};margin:0;padding:20px;color:${t.textPrimaryColor};">
  <div style="max-width:600px;margin:0 auto;background:${t.surfaceColor};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);padding:32px;">
    ${body}
  </div>
</body>
</html>`;
}
