import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Users, GripVertical } from "lucide-react";
import { toast } from "sonner";

interface Division {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  difficulty_level: string;
  team_size: number;
  gender: string | null;
  age_group: string | null;
  capacity: number | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  registration_count?: number;
}

interface ContextType {
  selectedEventId: string | null;
}

const emptyDivision: Partial<Division> = {
  name: "",
  description: "",
  difficulty_level: "rx",
  team_size: 1,
  gender: null,
  age_group: null,
  capacity: null,
  is_active: true,
};

export default function EventDivisions() {
  const { selectedEventId } = useOutletContext<ContextType>();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Division> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedEventId) {
      fetchDivisions();
    }
  }, [selectedEventId]);

  const fetchDivisions = async () => {
    if (!selectedEventId) return;

    try {
      const { data, error } = await supabase
        .from("event_divisions")
        .select(`
          *,
          event_registrations(count)
        `)
        .eq("event_id", selectedEventId)
        .order("display_order", { ascending: true });

      if (error) throw error;

      const divisionsWithCounts = (data || []).map((d: any) => ({
        ...d,
        registration_count: d.event_registrations?.[0]?.count || 0,
      }));

      setDivisions(divisionsWithCounts);
    } catch (error) {
      console.error("Error fetching divisions:", error);
      toast.error("Failed to load divisions");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editing?.name || !selectedEventId) {
      toast.error("Division name is required");
      return;
    }

    setSaving(true);
    try {
      if (editing.id) {
        const { error } = await supabase
          .from("event_divisions")
          .update({
            name: editing.name,
            description: editing.description,
            difficulty_level: editing.difficulty_level,
            team_size: editing.team_size,
            gender: editing.gender,
            age_group: editing.age_group,
            capacity: editing.capacity,
            is_active: editing.is_active,
          })
          .eq("id", editing.id);

        if (error) throw error;
        toast.success("Division updated");
      } else {
        const { error } = await supabase.from("event_divisions").insert({
          event_id: selectedEventId,
          name: editing.name,
          description: editing.description,
          difficulty_level: editing.difficulty_level,
          team_size: editing.team_size || 1,
          gender: editing.gender,
          age_group: editing.age_group,
          capacity: editing.capacity,
          is_active: editing.is_active ?? true,
          display_order: divisions.length,
        });

        if (error) throw error;
        toast.success("Division created");
      }

      setDialogOpen(false);
      setEditing(null);
      fetchDivisions();
    } catch (error) {
      console.error("Error saving division:", error);
      toast.error("Failed to save division");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this division? Registrations will lose their division assignment.")) {
      return;
    }

    try {
      const { error } = await supabase.from("event_divisions").delete().eq("id", id);
      if (error) throw error;
      toast.success("Division deleted");
      fetchDivisions();
    } catch (error) {
      console.error("Error deleting division:", error);
      toast.error("Failed to delete division");
    }
  };

  if (!selectedEventId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Event Selected</h2>
        <p className="text-muted-foreground">
          Select an event from the dropdown to manage divisions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories / Divisions</h1>
          <p className="text-muted-foreground">
            Define competition categories and divisions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(emptyDivision)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Division
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing?.id ? "Edit Division" : "Create Division"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Division Name *</Label>
                <Input
                  id="name"
                  value={editing?.name || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Elite RX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editing?.description || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Division requirements..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select
                    value={editing?.difficulty_level || "rx"}
                    onValueChange={(v) =>
                      setEditing((prev) => ({ ...prev, difficulty_level: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rx">RX</SelectItem>
                      <SelectItem value="scaled">Scaled</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="masters">Masters</SelectItem>
                      <SelectItem value="teens">Teens</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team_size">Team Size</Label>
                  <Input
                    id="team_size"
                    type="number"
                    min={1}
                    value={editing?.team_size || 1}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        team_size: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    1 = Individual
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select
                    value={editing?.gender || "any"}
                    onValueChange={(v) =>
                      setEditing((prev) => ({
                        ...prev,
                        gender: v === "any" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Age Group</Label>
                  <Select
                    value={editing?.age_group || "any"}
                    onValueChange={(v) =>
                      setEditing((prev) => ({
                        ...prev,
                        age_group: v === "any" ? null : v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      <SelectItem value="teens_14_17">Teens (14-17)</SelectItem>
                      <SelectItem value="open">Open (18+)</SelectItem>
                      <SelectItem value="masters_35">Masters 35+</SelectItem>
                      <SelectItem value="masters_40">Masters 40+</SelectItem>
                      <SelectItem value="masters_45">Masters 45+</SelectItem>
                      <SelectItem value="masters_50">Masters 50+</SelectItem>
                      <SelectItem value="masters_55">Masters 55+</SelectItem>
                      <SelectItem value="masters_60">Masters 60+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (optional)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  value={editing?.capacity || ""}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      capacity: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="Unlimited"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Available for registration
                  </p>
                </div>
                <Switch
                  checked={editing?.is_active ?? true}
                  onCheckedChange={(v) =>
                    setEditing((prev) => ({ ...prev, is_active: v }))
                  }
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : editing?.id ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Team Size</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : divisions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <p className="text-muted-foreground">No divisions yet</p>
                    <Button
                      variant="link"
                      onClick={() => {
                        setEditing(emptyDivision);
                        setDialogOpen(true);
                      }}
                    >
                      Create your first division
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                divisions.map((div) => (
                  <TableRow key={div.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{div.name}</p>
                        {div.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {div.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {div.difficulty_level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {div.team_size === 1 ? "Individual" : `Team of ${div.team_size}`}
                    </TableCell>
                    <TableCell>
                      {div.capacity || "Unlimited"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {div.registration_count || 0}
                        {div.capacity && ` / ${div.capacity}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={div.is_active ? "default" : "secondary"}>
                        {div.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(div);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(div.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
