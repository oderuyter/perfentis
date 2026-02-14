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
  ArrowLeft, Save, Send, Eye, Code, Paintbrush, Monitor, Smartphone,
  Loader2, Upload, History, RotateCcw, Tag, AlertTriangle, CheckCircle, Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmailTemplates, MERGE_TAGS, type EmailTemplate, type EmailTemplateVersion } from "@/hooks/useEmailTemplates";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

export default function AdminEmailTemplateEditor() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { saveDraft, publishVersion, rollbackVersion } = useEmailTemplates();

  // Load template
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ["email-template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", templateId!)
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    enabled: !!templateId,
  });

  // Load versions
  const { data: versions = [], refetch: refetchVersions } = useQuery({
    queryKey: ["email-template-versions", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_template_versions")
        .select("*")
        .eq("template_id", templateId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as EmailTemplateVersion[];
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

  // Initialize editor from draft or published version
  useEffect(() => {
    const source = draftVersion || publishedVersion;
    if (source) {
      setSubject(source.subject);
      setPreheader(source.preheader || "");
      setHtmlContent(source.html_content);
      setEditorMode(source.editor_mode as "html" | "wysiwyg");
      setDesignJson(Array.isArray(source.design_json) ? source.design_json : []);
    }
  }, [draftVersion, publishedVersion]);

  // Detect used variables
  const detectedVariables = useMemo(() => {
    const combined = `${subject} ${preheader} ${htmlContent}`;
    const matches = combined.match(/\{\{[^}]+\}\}/g) || [];
    return [...new Set(matches)];
  }, [subject, preheader, htmlContent]);

  // Validate template
  const validationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!subject.trim()) warnings.push("Subject line is empty");
    if (!htmlContent.trim()) warnings.push("HTML content is empty");
    // Check for unknown variables
    const allKnownTags = [...MERGE_TAGS.common, ...MERGE_TAGS.invites, ...MERGE_TAGS.notifications].map((t) => t.tag);
    detectedVariables.forEach((v) => {
      if (!allKnownTags.includes(v)) warnings.push(`Unknown variable: ${v}`);
    });
    return warnings;
  }, [subject, htmlContent, detectedVariables]);

  const handleSaveDraft = async () => {
    if (!templateId) return;
    saveDraft.mutate({
      templateId,
      subject,
      preheader,
      html_content: htmlContent,
      editor_mode: editorMode,
      design_json: designJson,
      variables_used: detectedVariables,
      notes,
    }, {
      onSuccess: () => refetchVersions(),
    });
  };

  const handlePublish = async () => {
    if (!draftVersion && !publishedVersion) {
      toast.error("Save a draft first before publishing");
      return;
    }
    const versionToPublish = draftVersion || publishedVersion;
    if (!versionToPublish || !templateId) return;

    // Save current state as draft first if it's new changes
    if (draftVersion) {
      await saveDraft.mutateAsync({
        templateId,
        subject,
        preheader,
        html_content: htmlContent,
        editor_mode: editorMode,
        design_json: designJson,
        variables_used: detectedVariables,
        notes,
      });
    }

    const vId = draftVersion?.id || publishedVersion?.id;
    if (!vId) return;
    publishVersion.mutate({ templateId, versionId: vId }, {
      onSuccess: () => refetchVersions(),
    });
  };

  const handleTestSend = async () => {
    if (!testEmail || !template) return;
    setSending(true);
    try {
      // Render with sample data
      const sampleData: Record<string, any> = {
        subject: subject || "Test",
        body: "This is a test email preview.",
        title: "Test Notification",
        appUrl: window.location.origin,
        settingsUrl: `${window.location.origin}/profile`,
        "user.first_name": "John",
        "user.last_name": "Doe",
        "user.email": testEmail,
        actionUrl: window.location.origin,
      };

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

  // Render preview HTML with sample values
  const previewHtml = useMemo(() => {
    let html = htmlContent;
    const allTags = [...MERGE_TAGS.common, ...MERGE_TAGS.invites, ...MERGE_TAGS.notifications];
    allTags.forEach(({ tag, sample }) => {
      html = html.replace(new RegExp(tag.replace(/[{}]/g, "\\$&"), "g"), sample);
    });
    return html;
  }, [htmlContent]);

  if (templateLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return <div className="text-center py-20 text-muted-foreground">Template not found</div>;
  }

  const availableTags = [
    ...MERGE_TAGS.common,
    ...(template.category === "invites" ? MERGE_TAGS.invites : []),
    ...(["notifications"].includes(template.category) ? MERGE_TAGS.notifications : []),
  ];

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
          {draftVersion && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">Draft</Badge>
          )}
          {publishedVersion && (
            <Badge variant="outline" className="text-green-600 border-green-300">
              v{publishedVersion.version_number} Published
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="test">Test Send</TabsTrigger>
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
        </TabsList>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              {/* Subject & Preheader */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1.5">
                    <Label>Subject Line</Label>
                    <Input
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject (supports {{variables}})"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preheader</Label>
                    <Input
                      value={preheader}
                      onChange={(e) => setPreheader(e.target.value)}
                      placeholder="Preview text shown in inbox"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Editor Mode Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant={editorMode === "wysiwyg" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode("wysiwyg")}
                >
                  <Paintbrush className="h-4 w-4 mr-1" />
                  WYSIWYG
                </Button>
                <Button
                  variant={editorMode === "html" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditorMode("html")}
                >
                  <Code className="h-4 w-4 mr-1" />
                  HTML
                </Button>
                {editorMode === "wysiwyg" && (
                  <span className="text-xs text-muted-foreground ml-2">
                    Block editor — complex HTML may not round-trip perfectly
                  </span>
                )}
              </div>

              {/* HTML Editor */}
              {editorMode === "html" && (
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
              )}

              {/* WYSIWYG Editor (Block-based) */}
              {editorMode === "wysiwyg" && (
                <WysiwygEditor
                  blocks={designJson}
                  onChange={(blocks, html) => {
                    setDesignJson(blocks);
                    setHtmlContent(html);
                  }}
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
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What changed in this version?"
                />
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
                        Publishing will make this version live for all outgoing emails using this template.
                        {validationWarnings.length > 0 && ` There are ${validationWarnings.length} validation warning(s).`}
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

            {/* Variables Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Merge Tags
                  </CardTitle>
                  <CardDescription className="text-xs">Click to copy</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-1">
                      {availableTags.map((t) => (
                        <button
                          key={t.tag}
                          onClick={() => {
                            navigator.clipboard.writeText(t.tag);
                            toast.success(`Copied ${t.tag}`);
                          }}
                          className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                        >
                          <p className="font-mono text-xs text-primary">{t.tag}</p>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Detected Variables</CardTitle>
                </CardHeader>
                <CardContent>
                  {detectedVariables.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {detectedVariables.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No variables detected</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={previewMode === "desktop" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("desktop")}
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
            <Button
              variant={previewMode === "mobile" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewMode("mobile")}
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <div className="mb-3 space-y-1">
                <p className="text-sm"><span className="text-muted-foreground">Subject:</span> {subject || "(empty)"}</p>
                {preheader && <p className="text-sm"><span className="text-muted-foreground">Preheader:</span> {preheader}</p>}
              </div>
              <Separator className="mb-4" />
              <div className="flex justify-center">
                <div
                  className="border rounded-lg overflow-hidden bg-white"
                  style={{ width: previewMode === "mobile" ? 375 : "100%", maxWidth: "100%" }}
                >
                  <iframe
                    srcDoc={previewHtml || "<p style='padding:20px;color:#999'>No content to preview</p>"}
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

        {/* Test Send Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Send Test Email
              </CardTitle>
              <CardDescription>Send a test using the current draft with sample variable data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Recipient Email</Label>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Uses sample merge tag values. Result will be logged in Email Logs.</span>
              </div>
              <Button onClick={handleTestSend} disabled={sending || !testEmail}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No versions yet. Save a draft to get started.</p>
              ) : (
                <div className="space-y-3">
                  {versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-center">
                          <p className="font-bold text-lg">v{v.version_number}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={v.status === "published" ? "default" : v.status === "draft" ? "secondary" : "outline"}
                            >
                              {v.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(v.created_at), "PPp")}
                            </span>
                          </div>
                          {v.notes && <p className="text-xs text-muted-foreground mt-1">{v.notes}</p>}
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{v.subject}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {v.status === "archived" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Rollback
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Rollback to v{v.version_number}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will make v{v.version_number} the active published version.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => rollbackVersion.mutate({ templateId: templateId!, versionId: v.id })}
                                >
                                  Rollback
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSubject(v.subject);
                            setPreheader(v.preheader || "");
                            setHtmlContent(v.html_content);
                            setEditorMode(v.editor_mode as "html" | "wysiwyg");
                            setActiveTab("editor");
                            toast.success(`Loaded v${v.version_number} into editor`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Load
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

// ========== Simple WYSIWYG Block Editor ==========
interface Block {
  id: string;
  type: "text" | "image" | "button" | "divider" | "spacer" | "columns";
  content: string;
  props?: Record<string, any>;
}

function WysiwygEditor({ blocks, onChange }: { blocks: any[]; onChange: (blocks: Block[], html: string) => void }) {
  const [items, setItems] = useState<Block[]>(
    Array.isArray(blocks) && blocks.length > 0
      ? blocks
      : [{ id: crypto.randomUUID(), type: "text", content: "<p>Start editing your email content here...</p>" }]
  );

  const updateItems = (newItems: Block[]) => {
    setItems(newItems);
    onChange(newItems, blocksToHtml(newItems));
  };

  const addBlock = (type: Block["type"]) => {
    const defaults: Record<string, Partial<Block>> = {
      text: { content: "<p>New text block</p>" },
      image: { content: "", props: { src: "https://via.placeholder.com/600x200", alt: "Image" } },
      button: { content: "Click Here", props: { url: "#", color: "#6366f1" } },
      divider: { content: "" },
      spacer: { content: "", props: { height: 24 } },
      columns: { content: "", props: { left: "<p>Left column</p>", right: "<p>Right column</p>" } },
    };
    const newBlock: Block = { id: crypto.randomUUID(), type, ...defaults[type] } as Block;
    updateItems([...items, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    updateItems(items.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const removeBlock = (id: string) => {
    updateItems(items.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((b) => b.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === items.length - 1)) return;
    const newItems = [...items];
    [newItems[idx], newItems[idx + dir]] = [newItems[idx + dir], newItems[idx]];
    updateItems(newItems);
  };

  return (
    <div className="space-y-3">
      {/* Block toolbar */}
      <div className="flex flex-wrap gap-1.5">
        {(["text", "image", "button", "divider", "spacer", "columns"] as const).map((type) => (
          <Button key={type} variant="outline" size="sm" onClick={() => addBlock(type)} className="capitalize">
            + {type}
          </Button>
        ))}
      </div>

      {/* Blocks */}
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
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive ml-auto" onClick={() => removeBlock(block.id)}>
                      Remove
                    </Button>
                  </div>

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
                      <Input
                        value={block.props?.src || ""}
                        onChange={(e) => updateBlock(block.id, { props: { ...block.props, src: e.target.value } })}
                        placeholder="Image URL"
                      />
                      <Input
                        value={block.props?.alt || ""}
                        onChange={(e) => updateBlock(block.id, { props: { ...block.props, alt: e.target.value } })}
                        placeholder="Alt text"
                      />
                    </div>
                  )}

                  {block.type === "button" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={block.content}
                        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                        placeholder="Button label"
                      />
                      <Input
                        value={block.props?.url || ""}
                        onChange={(e) => updateBlock(block.id, { props: { ...block.props, url: e.target.value } })}
                        placeholder="URL"
                      />
                    </div>
                  )}

                  {block.type === "divider" && (
                    <hr className="my-2" />
                  )}

                  {block.type === "spacer" && (
                    <Input
                      type="number"
                      value={block.props?.height || 24}
                      onChange={(e) => updateBlock(block.id, { props: { ...block.props, height: parseInt(e.target.value) || 24 } })}
                      className="w-24"
                      min={8}
                      max={120}
                    />
                  )}

                  {block.type === "columns" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Textarea
                        value={block.props?.left || ""}
                        onChange={(e) => updateBlock(block.id, { props: { ...block.props, left: e.target.value } })}
                        placeholder="Left column HTML"
                        className="font-mono text-xs min-h-[60px]"
                      />
                      <Textarea
                        value={block.props?.right || ""}
                        onChange={(e) => updateBlock(block.id, { props: { ...block.props, right: e.target.value } })}
                        placeholder="Right column HTML"
                        className="font-mono text-xs min-h-[60px]"
                      />
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

function blocksToHtml(blocks: Block[]): string {
  const body = blocks.map((b) => {
    switch (b.type) {
      case "text":
        return b.content;
      case "image":
        return `<img src="${b.props?.src || ""}" alt="${b.props?.alt || ""}" style="max-width:100%;height:auto;display:block;margin:0 auto;" />`;
      case "button":
        return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td><a href="${b.props?.url || "#"}" style="display:inline-block;background:${b.props?.color || "#6366f1"};color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${b.content}</a></td></tr></table>`;
      case "divider":
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />`;
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); padding: 32px;">
    ${body}
  </div>
</body>
</html>`;
}
