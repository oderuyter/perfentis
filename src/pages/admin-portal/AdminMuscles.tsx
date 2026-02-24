import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { MuscleGroupRecord, MuscleSubgroupRecord } from "@/types/exercise";

export default function AdminMuscles() {
  const queryClient = useQueryClient();
  const [editGroup, setEditGroup] = useState<MuscleGroupRecord | null>(null);
  const [editSubgroup, setEditSubgroup] = useState<MuscleSubgroupRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [addMode, setAddMode] = useState<'group' | 'subgroup' | null>(null);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['admin-muscle-groups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('muscle_groups').select('*').order('sort_order');
      if (error) throw error;
      return data as MuscleGroupRecord[];
    },
  });

  const { data: subgroups = [], isLoading: loadingSubgroups } = useQuery({
    queryKey: ['admin-muscle-subgroups'],
    queryFn: async () => {
      const { data, error } = await supabase.from('muscle_subgroups').select('*').order('sort_order');
      if (error) throw error;
      return data as MuscleSubgroupRecord[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-muscle-groups'] });
    queryClient.invalidateQueries({ queryKey: ['admin-muscle-subgroups'] });
    queryClient.invalidateQueries({ queryKey: ['muscle-groups'] });
    queryClient.invalidateQueries({ queryKey: ['muscle-subgroups'] });
  };

  const addGroupMut = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = Math.max(0, ...groups.map(g => g.sort_order));
      const { error } = await supabase.from('muscle_groups').insert({ name, sort_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Group added'); setAddMode(null); setNewName(""); },
    onError: () => toast.error('Failed'),
  });

  const addSubgroupMut = useMutation({
    mutationFn: async ({ name, groupId }: { name: string; groupId: string }) => {
      const siblings = subgroups.filter(s => s.muscle_group_id === groupId);
      const maxOrder = Math.max(0, ...siblings.map(s => s.sort_order));
      const { error } = await supabase.from('muscle_subgroups').insert({
        name, muscle_group_id: groupId, sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Subgroup added'); setAddMode(null); setNewName(""); },
    onError: () => toast.error('Failed'),
  });

  const updateGroupMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('muscle_groups').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Updated'); setEditGroup(null); },
  });

  const updateSubgroupMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('muscle_subgroups').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Updated'); setEditSubgroup(null); },
  });

  const toggleActive = async (table: 'muscle_groups' | 'muscle_subgroups', id: string, current: boolean) => {
    const { error } = await supabase.from(table).update({ is_active: !current }).eq('id', id);
    if (!error) { invalidate(); toast.success(current ? 'Deactivated' : 'Activated'); }
  };

  if (loadingGroups || loadingSubgroups) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Muscle Taxonomy</h1>
          <p className="text-muted-foreground">Manage muscle groups and subgroups</p>
        </div>
        <Button size="sm" onClick={() => { setAddMode('group'); setNewName(""); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Group
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Accordion type="multiple" className="w-full">
            {groups.map(group => {
              const subs = subgroups.filter(s => s.muscle_group_id === group.id);
              return (
                <AccordionItem key={group.id} value={group.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 flex-1 text-left">
                      <span className="font-semibold">{group.name}</span>
                      <Badge variant="outline" className="text-xs">{subs.length} subgroups</Badge>
                      {!group.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pl-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditGroup(group); setEditName(group.name); }}>
                          <Edit className="h-3 w-3 mr-1" /> Rename
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleActive('muscle_groups', group.id, group.is_active)}>
                          {group.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setAddMode('subgroup'); setAddParentId(group.id); setNewName(""); }}>
                          <Plus className="h-3 w-3 mr-1" /> Add Subgroup
                        </Button>
                      </div>
                      {subs.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Subgroup</TableHead>
                              <TableHead>Order</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subs.sort((a, b) => a.sort_order - b.sort_order).map(sub => (
                              <TableRow key={sub.id}>
                                <TableCell>{sub.name}</TableCell>
                                <TableCell>{sub.sort_order}</TableCell>
                                <TableCell>{sub.is_active ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditSubgroup(sub); setEditName(sub.name); }}>
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => toggleActive('muscle_subgroups', sub.id, sub.is_active)}>
                                      {sub.is_active ? '✗' : '✓'}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Edit Group Dialog */}
      <Dialog open={!!editGroup} onOpenChange={() => setEditGroup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Muscle Group</DialogTitle></DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroup(null)}>Cancel</Button>
            <Button onClick={() => editGroup && updateGroupMut.mutate({ id: editGroup.id, name: editName })}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Subgroup Dialog */}
      <Dialog open={!!editSubgroup} onOpenChange={() => setEditSubgroup(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Subgroup</DialogTitle></DialogHeader>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubgroup(null)}>Cancel</Button>
            <Button onClick={() => editSubgroup && updateSubgroupMut.mutate({ id: editSubgroup.id, name: editName })}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={!!addMode} onOpenChange={() => setAddMode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{addMode === 'group' ? 'Add Muscle Group' : 'Add Subgroup'}</DialogTitle></DialogHeader>
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMode(null)}>Cancel</Button>
            <Button
              disabled={!newName.trim()}
              onClick={() => {
                if (addMode === 'group') addGroupMut.mutate(newName.trim());
                else if (addParentId) addSubgroupMut.mutate({ name: newName.trim(), groupId: addParentId });
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
