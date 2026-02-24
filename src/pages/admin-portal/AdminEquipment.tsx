import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Search, Check, X, Edit, Plus, Loader2, Archive } from "lucide-react";
import { useEquipmentLibrary } from "@/hooks/useEquipmentLibrary";
import { logAuditEvent } from "@/hooks/useAuditLog";
import type { EquipmentRecord } from "@/types/exercise";

export default function AdminEquipment() {
  const {
    equipment, isLoading, approveEquipment, rejectEquipment, updateEquipment,
  } = useEquipmentLibrary();
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editItem, setEditItem] = useState<EquipmentRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const pending = equipment.filter(e => e.status === 'pending');
  
  const filtered = equipment.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApprove = async (item: EquipmentRecord) => {
    await approveEquipment({ id: item.id, adminNotes: adminNotes || undefined });
    await logAuditEvent({
      action: "equipment.approved",
      message: `Equipment "${item.name}" approved`,
      category: "moderation",
      entityType: "equipment",
      entityId: item.id,
    });
    setEditItem(null);
  };

  const handleReject = async (item: EquipmentRecord) => {
    await rejectEquipment({ id: item.id, adminNotes: adminNotes || undefined });
    await logAuditEvent({
      action: "equipment.rejected",
      message: `Equipment "${item.name}" rejected`,
      category: "moderation",
      severity: "warn",
      entityType: "equipment",
      entityId: item.id,
    });
    setEditItem(null);
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    await updateEquipment({
      id: editItem.id,
      name: editName,
      category: editCategory || undefined,
      admin_notes: adminNotes || undefined,
    });
    setEditItem(null);
  };

  const handleAddEquipment = async () => {
    if (!newName.trim()) return;
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.from('equipment').insert({
      name: newName.trim(),
      category: newCategory || null,
      source: 'admin',
      status: 'approved',
    });
    if (!error) {
      setShowAdd(false);
      setNewName("");
      setNewCategory("");
      // Refetch
      window.location.reload();
    }
  };

  const openEdit = (item: EquipmentRecord) => {
    setEditItem(item);
    setEditName(item.name);
    setEditCategory(item.category || "");
    setAdminNotes(item.admin_notes || "");
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="default">Approved</Badge>;
      case 'pending': return <Badge variant="secondary">Pending</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipment Database</h1>
          <p className="text-muted-foreground">Manage equipment items and user submissions</p>
        </div>
        <div className="flex gap-2">
          {pending.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {pending.length} pending
            </Badge>
          )}
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Equipment
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{item.source}</Badge>
                    </TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                    <TableCell>{item.is_active ? "✓" : "✗"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {item.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="icon" className="text-green-600" onClick={() => handleApprove(item)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleReject(item)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {item.is_active && item.status === 'approved' && (
                          <Button variant="ghost" size="icon" onClick={() => updateEquipment({ id: item.id, is_active: false })}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Equipment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="e.g. Free Weights" />
            </div>
            <div>
              <label className="text-sm font-medium">Admin Notes</label>
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Equipment name" />
            </div>
            <div>
              <label className="text-sm font-medium">Category</label>
              <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Free Weights, Machines, Cardio" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAddEquipment} disabled={!newName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
