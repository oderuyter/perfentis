import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Monitor, Plus, Copy, ExternalLink, RefreshCw, Pencil, Trash2, Power, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useDisplays } from "@/hooks/useDisplays";
import { toast } from "sonner";

export default function CoachDisplays() {
  const { coach } = useOutletContext<{ coach: { id: string; display_name: string } | null }>();
  const coachId = coach?.id || null;
  const { displays, isLoading, addDisplay, updateDisplay, regenerateToken, deleteDisplay, startSession } = useDisplays("coach", coachId);
  const [newName, setNewName] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [startingFor, setStartingFor] = useState<string | null>(null);

  const getDisplayUrl = (token: string) => `${window.location.origin}/display/${token}`;

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(getDisplayUrl(token));
    toast.success("URL copied to clipboard");
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addDisplay(newName.trim());
    setNewName("");
    setAddOpen(false);
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    await updateDisplay(id, { name: editName.trim() });
    setEditingId(null);
  };

  const handleStartSession = async (displayId: string) => {
    if (!sessionTitle.trim()) return;
    await startSession(displayId, sessionTitle.trim());
    setSessionTitle("");
    setStartingFor(null);
  };

  if (!coachId) {
    return <p className="text-muted-foreground">Loading coach data...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Displays</h2>
          <p className="text-muted-foreground text-sm">Manage display screens for coaching sessions</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Display</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Display</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Display Name</Label>
                <Input placeholder="e.g. Studio Screen 1" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <Button onClick={handleAdd} className="w-full">Create Display</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : displays.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No displays configured yet</p>
            <p className="text-sm text-muted-foreground">Add a display to get a shareable URL for TV/tablet screens</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displays.map(display => (
            <Card key={display.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {editingId === display.id ? (
                    <div className="flex gap-2 flex-1">
                      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" />
                      <Button size="sm" onClick={() => handleRename(display.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        {display.name}
                      </CardTitle>
                      <Badge variant={display.is_active ? "default" : "secondary"}>
                        {display.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted rounded-lg p-2.5 text-xs font-mono break-all text-muted-foreground">
                  {getDisplayUrl(display.display_token)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleCopy(display.display_token)}>
                    <Copy className="h-3.5 w-3.5" /> Copy URL
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(getDisplayUrl(display.display_token), '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setEditingId(display.id); setEditName(display.name); }}>
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setStartingFor(display.id); setSessionTitle(""); }}>
                    <Play className="h-3.5 w-3.5" /> Start Session
                  </Button>
                </div>
                <div className="flex gap-2 pt-1 border-t border-border">
                  <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => regenerateToken(display.id)}>
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate URL
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => updateDisplay(display.id, { is_active: !display.is_active })}>
                    <Power className="h-3.5 w-3.5" /> {display.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-destructive" onClick={() => { if (confirm("Delete this display?")) deleteDisplay(display.id); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Start Session Dialog */}
      <Dialog open={!!startingFor} onOpenChange={open => !open && setStartingFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Display Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Session Title</Label>
              <Input placeholder="e.g. Coaching Session" value={sessionTitle} onChange={e => setSessionTitle(e.target.value)} />
            </div>
            <Button onClick={() => startingFor && handleStartSession(startingFor)} className="w-full">Start Session</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
