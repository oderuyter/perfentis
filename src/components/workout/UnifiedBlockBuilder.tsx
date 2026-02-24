// Unified Block Builder - replaces WorkoutStructureEditor with block-aware version
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Dumbbell, Layers, Timer, Zap, Users, ChevronUp, ChevronDown, Trash2, Settings, Unlink, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AddExerciseSheet } from "./AddExerciseSheet";
import {
  type WorkoutBlock, type BlockExerciseItem, type BlockType,
  type SupersetSettings, type EmomSettings, type AmrapSettings, type YgigSettings,
  createSingleBlock, createEmptySupersetBlock, createEmomBlock, createAmrapBlock, createYgigBlock,
  generateBlockItemId,
} from "@/types/workout-blocks";

interface UnifiedBlockBuilderProps {
  blocks: WorkoutBlock[];
  onChange: (blocks: WorkoutBlock[]) => void;
  title?: string;
  readOnly?: boolean;
  allowFreeText?: boolean; // for event builder
}

const BLOCK_ICONS: Record<BlockType, typeof Dumbbell> = {
  single: Dumbbell,
  superset: Layers,
  emom: Timer,
  amrap: Zap,
  ygig: Users,
};

const BLOCK_LABELS: Record<BlockType, string> = {
  single: 'Exercise',
  superset: 'Superset',
  emom: 'EMOM',
  amrap: 'AMRAP',
  ygig: 'YGIG',
};

const BLOCK_COLORS: Record<BlockType, string> = {
  single: '',
  superset: 'border-primary/20 bg-primary/5',
  emom: 'border-amber-500/20 bg-amber-500/5',
  amrap: 'border-red-500/20 bg-red-500/5',
  ygig: 'border-blue-500/20 bg-blue-500/5',
};

function formatRestTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${mins}m`;
}

export function UnifiedBlockBuilder({ blocks, onChange, title = "Exercises", readOnly = false, allowFreeText = false }: UnifiedBlockBuilderProps) {
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [addingToBlockId, setAddingToBlockId] = useState<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set(blocks.map(b => b.id)));

  const toggleExpanded = (id: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reindex = (items: WorkoutBlock[]) => items.map((b, i) => ({ ...b, order_index: i }));

  const handleAddExercise = useCallback((exercise: { id: string; name: string; exerciseType?: 'strength' | 'cardio' }) => {
    if (addingToBlockId) {
      const updated = blocks.map(b => {
        if (b.id === addingToBlockId) {
          const newItem: BlockExerciseItem = {
            id: generateBlockItemId(),
            exercise_id: exercise.id,
            name: exercise.name,
            order_index: b.items.length,
            sets: 3,
            reps: exercise.exerciseType === 'cardio' ? undefined : 10,
            rest_seconds: 90,
            exercise_type: exercise.exerciseType,
          };
          return { ...b, items: [...b.items, newItem] };
        }
        return b;
      });
      onChange(updated);
      setAddingToBlockId(null);
    } else {
      const newBlock = createSingleBlock(exercise, blocks.length);
      onChange([...blocks, newBlock]);
    }
    setShowAddExercise(false);
  }, [blocks, onChange, addingToBlockId]);

  const addBlock = (type: BlockType) => {
    const creators: Record<BlockType, (i: number) => WorkoutBlock> = {
      single: () => { setShowAddExercise(true); return null as any; },
      superset: createEmptySupersetBlock,
      emom: createEmomBlock,
      amrap: createAmrapBlock,
      ygig: createYgigBlock,
    };
    if (type === 'single') {
      setShowAddExercise(true);
      return;
    }
    const newBlock = creators[type](blocks.length);
    setExpandedBlocks(prev => new Set([...prev, newBlock.id]));
    onChange([...blocks, newBlock]);
    toast.success(`${BLOCK_LABELS[type]} block added`);
  };

  const removeBlock = (id: string) => {
    onChange(reindex(blocks.filter(b => b.id !== id)));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    onChange(reindex(newBlocks));
  };

  const updateBlock = (id: string, updates: Partial<WorkoutBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const updateBlockSettings = (id: string, settingsUpdates: Partial<any>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, settings: { ...b.settings, ...settingsUpdates } } : b));
  };

  const updateBlockItem = (blockId: string, itemId: string, updates: Partial<BlockExerciseItem>) => {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, items: b.items.map(item => item.id === itemId ? { ...item, ...updates } : item) };
    }));
  };

  const removeBlockItem = (blockId: string, itemId: string) => {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      const newItems = b.items.filter(i => i.id !== itemId).map((i, idx) => ({ ...i, order_index: idx }));
      // If it was a superset/emom/amrap/ygig and only 1 item left in superset, convert to single
      if (b.type === 'superset' && newItems.length <= 1 && newItems.length > 0) {
        return { ...b, type: 'single' as BlockType, settings: {}, items: newItems, title: undefined };
      }
      if (newItems.length === 0 && b.type !== 'single') {
        return b; // keep empty multi-exercise blocks
      }
      return { ...b, items: newItems };
    }));
  };

  const moveBlockItem = (blockId: string, itemIndex: number, direction: 'up' | 'down') => {
    onChange(blocks.map(b => {
      if (b.id !== blockId) return b;
      const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
      if (newIndex < 0 || newIndex >= b.items.length) return b;
      const newItems = [...b.items];
      [newItems[itemIndex], newItems[newIndex]] = [newItems[newIndex], newItems[itemIndex]];
      return { ...b, items: newItems.map((i, idx) => ({ ...i, order_index: idx })) };
    }));
  };

  const ungroupBlock = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    const idx = blocks.indexOf(block);
    const singleBlocks = block.items.map((item, i) => createSingleBlock({ id: item.exercise_id, name: item.name, exerciseType: item.exercise_type }, 0));
    const newBlocks = [...blocks.slice(0, idx), ...singleBlocks, ...blocks.slice(idx + 1)];
    onChange(reindex(newBlocks));
    toast.success("Block ungrouped");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="secondary">{blocks.reduce((c, b) => c + b.items.length, 0)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {blocks.length === 0 ? (
          <div className="text-center py-8">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">No exercises added yet</p>
            <Button onClick={() => setShowAddExercise(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />Add Exercise
            </Button>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {blocks.map((block, blockIndex) => {
                const Icon = BLOCK_ICONS[block.type];
                const isMultiExercise = block.type !== 'single';
                const isExpanded = expandedBlocks.has(block.id);

                return (
                  <motion.div key={block.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <Card className={cn(isMultiExercise ? BLOCK_COLORS[block.type] : '')}>
                      <CardContent className="p-0">
                        {/* Block Header */}
                        <div className="flex items-center gap-2 p-3">
                          {!readOnly && (
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveBlock(blockIndex, 'up')} disabled={blockIndex === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                              <button onClick={() => moveBlock(blockIndex, 'down')} disabled={blockIndex === blocks.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                            </div>
                          )}
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isMultiExercise && !readOnly ? (
                              <Input value={block.title || ''} onChange={(e) => updateBlock(block.id, { title: e.target.value })} placeholder={`${BLOCK_LABELS[block.type]} name...`} className="h-7 text-sm font-medium bg-transparent border-none px-0 focus-visible:ring-0" />
                            ) : (
                              <p className="font-medium text-sm truncate">{isMultiExercise ? block.title || BLOCK_LABELS[block.type] : block.items[0]?.name || 'Exercise'}</p>
                            )}
                            {/* Block summary */}
                            <p className="text-xs text-muted-foreground">
                              {block.type === 'emom' && `${(block.settings as EmomSettings).rounds} rounds`}
                              {block.type === 'amrap' && `${Math.floor((block.settings as AmrapSettings).time_cap_seconds / 60)} min cap`}
                              {block.type === 'ygig' && `${(block.settings as YgigSettings).max_participants} partners`}
                              {block.type === 'superset' && `${(block.settings as SupersetSettings).rounds || 1} round${((block.settings as SupersetSettings).rounds || 1) > 1 ? 's' : ''}`}
                              {block.type === 'single' && block.items[0] && `${block.items[0].sets || 3}×${block.items[0].reps || '—'}`}
                            </p>
                          </div>
                          {isMultiExercise && <Badge variant="secondary" className="text-xs">{block.items.length}</Badge>}
                          {!readOnly && isMultiExercise && (
                            <BlockSettingsPopover block={block} onUpdateSettings={(u) => updateBlockSettings(block.id, u)} />
                          )}
                          {!readOnly && isMultiExercise && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => ungroupBlock(block.id)} title="Ungroup"><Unlink className="h-4 w-4 text-muted-foreground" /></Button>
                          )}
                          {!readOnly && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeBlock(block.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                          )}
                          {isMultiExercise && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleExpanded(block.id)}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>

                        {/* Single exercise inline edit */}
                        {block.type === 'single' && block.items[0] && !readOnly && (
                          <div className="px-3 pb-3 flex items-center gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground">Sets</Label>
                              <Input type="number" min={1} className="h-7 w-14 text-xs" value={block.items[0].sets || 3} onChange={(e) => updateBlockItem(block.id, block.items[0].id, { sets: parseInt(e.target.value) || 1 })} />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground">Reps</Label>
                              <Input type="number" min={1} className="h-7 w-14 text-xs" value={typeof block.items[0].reps === 'number' ? block.items[0].reps : ''} onChange={(e) => updateBlockItem(block.id, block.items[0].id, { reps: parseInt(e.target.value) || undefined })} />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-xs text-muted-foreground">Rest</Label>
                              <Input type="number" min={0} step={15} className="h-7 w-16 text-xs" value={block.items[0].rest_seconds || ''} onChange={(e) => updateBlockItem(block.id, block.items[0].id, { rest_seconds: parseInt(e.target.value) || undefined })} />
                            </div>
                          </div>
                        )}

                        {/* Multi-exercise block items */}
                        {isMultiExercise && (
                          <Collapsible open={isExpanded}>
                            <CollapsibleContent>
                              <div className="p-3 pt-0 space-y-2">
                                {block.items.map((item, itemIndex) => (
                                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/80">
                                    {!readOnly && (
                                      <div className="flex flex-col gap-0.5">
                                        <button onClick={() => moveBlockItem(block.id, itemIndex, 'up')} disabled={itemIndex === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                                        <button onClick={() => moveBlockItem(block.id, itemIndex, 'down')} disabled={itemIndex === block.items.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                                      </div>
                                    )}
                                    <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center text-xs">{String.fromCharCode(65 + itemIndex)}</Badge>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{item.name}</p>
                                      {item.item_notes && <p className="text-xs text-muted-foreground truncate">{item.item_notes}</p>}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <span>{item.sets || '—'}×</span>
                                      <span>{item.reps || '—'}</span>
                                    </div>
                                    {!readOnly && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBlockItem(block.id, item.id)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>
                                    )}
                                  </div>
                                ))}
                                {!readOnly && (
                                  <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => { setAddingToBlockId(block.id); setShowAddExercise(true); }}>
                                    <Plus className="h-3 w-3" />Add Exercise
                                  </Button>
                                )}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Plus className="h-4 w-4" />Add Block
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem onClick={() => addBlock('single')}><Dumbbell className="h-4 w-4 mr-2" />Exercise</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => addBlock('superset')}><Layers className="h-4 w-4 mr-2" />Superset</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('emom')}><Timer className="h-4 w-4 mr-2" />EMOM</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('amrap')}><Zap className="h-4 w-4 mr-2" />AMRAP</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addBlock('ygig')}><Users className="h-4 w-4 mr-2" />You Go, I Go</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </CardContent>

      {showAddExercise && (
        <AddExerciseSheet
          onAdd={handleAddExercise}
          onClose={() => { setShowAddExercise(false); setAddingToBlockId(null); }}
        />
      )}
    </Card>
  );
}

// ─── Block Settings Popover ──────────────────────────────────
function BlockSettingsPopover({ block, onUpdateSettings }: { block: WorkoutBlock; onUpdateSettings: (u: Partial<any>) => void }) {
  if (block.type === 'superset') {
    const s = block.settings as SupersetSettings;
    return (
      <Popover>
        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Rounds</Label>
              <Select value={(s.rounds || 1).toString()} onValueChange={(v) => onUpdateSettings({ rounds: parseInt(v) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n} round{n > 1 ? 's' : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rest after round</Label>
              <Select value={(s.rest_after_round_seconds || 90).toString()} onValueChange={(v) => onUpdateSettings({ rest_after_round_seconds: parseInt(v) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{[0,30,45,60,90,120,180].map(s => <SelectItem key={s} value={s.toString()}>{s === 0 ? 'No rest' : formatRestTime(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rest between exercises</Label>
              <Select value={(s.rest_between_exercises_seconds || 0).toString()} onValueChange={(v) => onUpdateSettings({ rest_between_exercises_seconds: parseInt(v) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{[0,15,30,45,60].map(s => <SelectItem key={s} value={s.toString()}>{s === 0 ? 'No rest' : formatRestTime(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (block.type === 'emom') {
    const s = block.settings as EmomSettings;
    return (
      <Popover>
        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Rounds (minutes)</Label>
              <Input type="number" min={1} max={60} className="h-8" value={s.rounds || 10} onChange={(e) => onUpdateSettings({ rounds: parseInt(e.target.value) || 10 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rest between rounds (s)</Label>
              <Input type="number" min={0} step={5} className="h-8" value={s.rest_seconds || 0} onChange={(e) => onUpdateSettings({ rest_seconds: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rotation mode</Label>
              <Select value={s.rotation_mode || 'rotate'} onValueChange={(v) => onUpdateSettings({ rotation_mode: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rotate">Rotate exercises each minute</SelectItem>
                  <SelectItem value="fixed">Same exercises each minute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (block.type === 'amrap') {
    const s = block.settings as AmrapSettings;
    return (
      <Popover>
        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Time cap (minutes)</Label>
              <Input type="number" min={1} max={60} className="h-8" value={Math.floor(s.time_cap_seconds / 60)} onChange={(e) => onUpdateSettings({ time_cap_seconds: (parseInt(e.target.value) || 10) * 60 })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rest button</Label>
              <Select value={s.rest_enabled ? 'yes' : 'no'} onValueChange={(v) => onUpdateSettings({ rest_enabled: v === 'yes' })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Disabled</SelectItem>
                  <SelectItem value="yes">Enabled (optional rest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (block.type === 'ygig') {
    const s = block.settings as YgigSettings;
    return (
      <Popover>
        <PopoverTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="h-4 w-4 text-muted-foreground" /></Button></PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Max participants</Label>
              <Select value={s.max_participants.toString()} onValueChange={(v) => onUpdateSettings({ max_participants: parseInt(v) })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{[2,3,4].map(n => <SelectItem key={n} value={n.toString()}>{n} people</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Turn mode</Label>
              <Select value={s.turn_mode} onValueChange={(v) => onUpdateSettings({ turn_mode: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="set_based">Alternate each set</SelectItem>
                  <SelectItem value="timed">Timed turns</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return null;
}

export default UnifiedBlockBuilder;
