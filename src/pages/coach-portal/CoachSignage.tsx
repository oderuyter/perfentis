import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Trash2, Image, Star, Shuffle, Clock, Monitor, Upload, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSignage, type SignageSlide } from "@/hooks/useSignage";
import { useDisplays } from "@/hooks/useDisplays";
import { toast } from "sonner";

export default function CoachSignage() {
  const { coach } = useOutletContext<{ coach: { id: string; display_name: string } | null }>();
  const coachId = coach?.id || null;
  const { playlists, isLoading, createPlaylist, updatePlaylist, deletePlaylist, fetchSlides, addSlide, updateSlide, deleteSlide, uploadSlideImage, fetchAssignments, assignPlaylist, removeAssignment, assignToAllDisplays } = useSignage("coach", coachId);
  const { displays } = useDisplays("coach", coachId);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const [slides, setSlides] = useState<Record<string, SignageSlide[]>>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFilePlaylistId, setActiveFilePlaylistId] = useState<string | null>(null);

  useEffect(() => {
    if (!coachId) return;
    fetchAssignments().then(a => {
      const map: Record<string, string> = {};
      a.forEach(x => { map[x.display_id] = x.playlist_id; });
      setAssignments(map);
    });
  }, [coachId, playlists]);

  const handleExpand = async (playlistId: string) => {
    if (expandedPlaylist === playlistId) { setExpandedPlaylist(null); return; }
    setExpandedPlaylist(playlistId);
    if (!slides[playlistId]) {
      const s = await fetchSlides(playlistId);
      setSlides(prev => ({ ...prev, [playlistId]: s }));
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createPlaylist(newName.trim());
    setNewName("");
    setCreateOpen(false);
  };

  const handleFileUpload = async (playlistId: string, files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    const existingSlides = slides[playlistId] || [];
    let nextOrder = existingSlides.length;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const url = await uploadSlideImage(file, playlistId);
      if (url) { await addSlide(playlistId, url, nextOrder); nextOrder++; }
    }
    const updatedSlides = await fetchSlides(playlistId);
    setSlides(prev => ({ ...prev, [playlistId]: updatedSlides }));
    setUploading(false);
    toast.success("Images uploaded");
  };

  const handleDeleteSlide = async (playlistId: string, slideId: string) => {
    await deleteSlide(slideId);
    const updatedSlides = await fetchSlides(playlistId);
    setSlides(prev => ({ ...prev, [playlistId]: updatedSlides }));
  };

  if (!coachId) return <p className="text-muted-foreground">Loading coach data...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Signage</h2>
          <p className="text-muted-foreground text-sm">Manage digital signage playlists for your displays</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Playlist</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Playlist</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Playlist Name</Label>
                <Input placeholder="e.g. Studio Signage" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <Button onClick={handleCreate} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : playlists.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Image className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No signage playlists yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {playlists.map(playlist => (
            <Card key={playlist.id}>
              <Collapsible open={expandedPlaylist === playlist.id} onOpenChange={() => handleExpand(playlist.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary transition-colors">
                      {expandedPlaylist === playlist.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <CardTitle className="text-base">{playlist.name}</CardTitle>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      {playlist.is_default && <Badge variant="default" className="gap-1"><Star className="h-3 w-3" /> Default</Badge>}
                      {playlist.shuffle && <Badge variant="secondary" className="gap-1"><Shuffle className="h-3 w-3" /> Shuffle</Badge>}
                      <Badge variant="outline">{playlist.transition_style}</Badge>
                      <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> {playlist.default_slide_duration_seconds}s</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Default</Label>
                        <Switch checked={playlist.is_default} onCheckedChange={v => updatePlaylist(playlist.id, { is_default: v })} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Shuffle</Label>
                        <Switch checked={playlist.shuffle} onCheckedChange={v => updatePlaylist(playlist.id, { shuffle: v })} />
                      </div>
                      <div>
                        <Label className="text-xs">Transition</Label>
                        <Select value={playlist.transition_style} onValueChange={v => updatePlaylist(playlist.id, { transition_style: v as "fade" | "cut" })}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fade">Fade</SelectItem>
                            <SelectItem value="cut">Cut</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Duration (s)</Label>
                        <Input type="number" className="h-8" value={playlist.default_slide_duration_seconds} onChange={e => updatePlaylist(playlist.id, { default_slide_duration_seconds: parseInt(e.target.value) || 8 })} />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => { if (activeFilePlaylistId) handleFileUpload(activeFilePlaylistId, e.target.files); }} />
                      <Button variant="outline" className="gap-2" onClick={() => { setActiveFilePlaylistId(playlist.id); fileInputRef.current?.click(); }} disabled={uploading}>
                        <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Images"}
                      </Button>
                      <Button variant="outline" className="gap-2" onClick={() => assignToAllDisplays(playlist.id)}>
                        <Monitor className="h-4 w-4" /> Assign to All Displays
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(slides[playlist.id] || []).map(slide => (
                        <div key={slide.id} className="relative group rounded-lg overflow-hidden border border-border">
                          {slide.image_url && (
                            <img src={slide.image_url} alt={slide.caption || "Slide"} className="w-full aspect-video object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDeleteSlide(playlist.id, slide.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {displays.length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-sm font-medium mb-2">Display Assignments</p>
                        <div className="space-y-2">
                          {displays.map(d => (
                            <div key={d.id} className="flex items-center justify-between py-1">
                              <span className="text-sm">{d.name}</span>
                              {assignments[d.id] === playlist.id ? (
                                <Badge variant="default" className="text-xs">Assigned</Badge>
                              ) : (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => assignPlaylist(d.id, playlist.id).then(() => setAssignments(p => ({ ...p, [d.id]: playlist.id })))}>
                                  Assign
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-border">
                      <Button variant="ghost" className="text-destructive gap-1.5" onClick={() => { if (confirm("Delete this playlist?")) deletePlaylist(playlist.id); }}>
                        <Trash2 className="h-3.5 w-3.5" /> Delete Playlist
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
