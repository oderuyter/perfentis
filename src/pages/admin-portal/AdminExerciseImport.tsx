import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, Check, AlertTriangle, X, Loader2, FileText, AlertCircle, RotateCcw } from 'lucide-react';
import { useMuscleTaxonomy } from '@/hooks/useMuscleTaxonomy';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';
import { logAuditEvent } from '@/hooks/useAuditLog';
import { toast } from 'sonner';

interface ParsedRow {
  rowIndex: number;
  exercise_name: string;
  modality: string;
  record_type: string;
  primary_muscle_group: string;
  primary_muscle_subgroup: string;
  secondary_muscle_groups: string[];
  secondary_muscle_subgroups: string[];
  equipment: string[];
  instructions: string;
  tags: string[];
  difficulty: string;
  video_url: string;
  image_primary_url: string;
  image_secondary_url: string;
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  willCreate: string[]; // "new muscle group: X", "new equipment: Y"
}

interface ImportResult {
  rowIndex: number;
  exercise_name: string;
  success: boolean;
  exerciseId?: string;
  createdTaxonomy: string[];
  error?: string;
}

const VALID_MODALITIES = ['strength', 'cardio'];
const VALID_RECORD_TYPES = ['weight_reps', 'reps', 'cardio', 'reps_duration', 'duration'];
const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced', ''];

const CSV_TEMPLATE = `exercise_name,modality,record_type,primary_muscle_group,primary_muscle_subgroup,secondary_muscle_groups,secondary_muscle_subgroups,equipment,instructions,tags,difficulty,video_url,image_primary_url,image_secondary_url
"Barbell Bench Press","strength","weight_reps","Chest","Upper Chest","Shoulders|Triceps","Front Delts|","Barbell|Bench","Lie on a flat bench, grip the barbell, lower to chest, press up.","compound|push","intermediate","","",""
"Plank","strength","duration","Abs","","Obliques|Lower Back","","Bodyweight","Hold a prone position on forearms and toes.","isometric|core","beginner","","",""
"Treadmill Run","cardio","cardio","","","","","Treadmill","Run on a treadmill at desired pace and incline.","cardio|endurance","beginner","","",""`;

export default function AdminExerciseImport() {
  const queryClient = useQueryClient();
  const { muscleGroups, muscleSubgroups, getSubgroupsForGroup } = useMuscleTaxonomy();
  const { approvedEquipment } = useEquipmentLibrary();

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [batchId] = useState(() => crypto.randomUUID());

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exercise_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please select a CSV file'); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
      setStep('preview');
    };
    reader.readAsText(file);
  }, [muscleGroups, muscleSubgroups, approvedEquipment]);

  const parseCSV = (text: string): ParsedRow[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const getIdx = (name: string) => headers.indexOf(name);

    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const get = (name: string) => values[getIdx(name)]?.trim() || '';

      const exercise_name = get('exercise_name');
      const modality = get('modality').toLowerCase();
      const record_type = get('record_type').toLowerCase();
      const primary_muscle_group = get('primary_muscle_group');
      const primary_muscle_subgroup = get('primary_muscle_subgroup');
      const secondary_muscle_groups = get('secondary_muscle_groups').split('|').filter(Boolean);
      const secondary_muscle_subgroups = get('secondary_muscle_subgroups').split('|').filter(Boolean);
      const equipment = get('equipment').split('|').filter(Boolean);
      const instructions = get('instructions');
      const tags = get('tags').split('|').filter(Boolean);
      const difficulty = get('difficulty').toLowerCase();
      const video_url = get('video_url');
      const image_primary_url = get('image_primary_url');
      const image_secondary_url = get('image_secondary_url');

      const messages: string[] = [];
      const willCreate: string[] = [];
      let status: 'ok' | 'warning' | 'error' = 'ok';

      // Validate required
      if (!exercise_name) { messages.push('Missing exercise_name'); status = 'error'; }
      if (!VALID_MODALITIES.includes(modality)) { messages.push(`Invalid modality: "${modality}"`); status = 'error'; }
      if (!VALID_RECORD_TYPES.includes(record_type)) { messages.push(`Invalid record_type: "${record_type}"`); status = 'error'; }
      if (modality === 'strength' && !primary_muscle_group) { messages.push('Strength exercises require primary_muscle_group'); status = 'error'; }
      if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) { messages.push(`Invalid difficulty: "${difficulty}"`); status = 'error'; }

      // Check taxonomy existence
      if (primary_muscle_group) {
        const existing = muscleGroups.find(g => g.name.toLowerCase() === primary_muscle_group.toLowerCase());
        if (!existing) { willCreate.push(`New muscle group: ${primary_muscle_group}`); if (status === 'ok') status = 'warning'; }
      }
      if (primary_muscle_subgroup && primary_muscle_group) {
        const parentGroup = muscleGroups.find(g => g.name.toLowerCase() === primary_muscle_group.toLowerCase());
        if (parentGroup) {
          const existingSub = getSubgroupsForGroup(parentGroup.id).find(s => s.name.toLowerCase() === primary_muscle_subgroup.toLowerCase());
          if (!existingSub) { willCreate.push(`New subgroup: ${primary_muscle_subgroup}`); if (status === 'ok') status = 'warning'; }
        } else {
          willCreate.push(`New subgroup: ${primary_muscle_subgroup} (under new group)`);
          if (status === 'ok') status = 'warning';
        }
      }
      for (const sg of secondary_muscle_groups) {
        if (!muscleGroups.find(g => g.name.toLowerCase() === sg.toLowerCase())) {
          willCreate.push(`New muscle group: ${sg}`);
          if (status === 'ok') status = 'warning';
        }
      }
      for (const eq of equipment) {
        if (!approvedEquipment.find(e => e.name.toLowerCase() === eq.toLowerCase())) {
          willCreate.push(`New equipment: ${eq}`);
          if (status === 'ok') status = 'warning';
        }
      }

      rows.push({
        rowIndex: i,
        exercise_name, modality, record_type,
        primary_muscle_group, primary_muscle_subgroup,
        secondary_muscle_groups, secondary_muscle_subgroups,
        equipment, instructions, tags, difficulty,
        video_url, image_primary_url, image_secondary_url,
        status, messages, willCreate,
      });
    }

    return rows;
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.status !== 'error');
    if (validRows.length === 0) { toast.error('No valid rows to import'); return; }
    setStep('importing');

    const results: ImportResult[] = [];

    for (const row of validRows) {
      try {
        const createdTaxonomy: string[] = [];

        // 1. Resolve/create primary muscle group
        let primaryGroupId: string | null = null;
        if (row.primary_muscle_group) {
          let group = muscleGroups.find(g => g.name.toLowerCase() === row.primary_muscle_group.toLowerCase());
          if (!group) {
            const { data, error } = await supabase.from('muscle_groups').insert({ name: row.primary_muscle_group, sort_order: muscleGroups.length + 1, is_active: true }).select().single();
            if (error) throw error;
            primaryGroupId = data.id;
            createdTaxonomy.push(`Created muscle group: ${row.primary_muscle_group}`);
          } else {
            primaryGroupId = group.id;
          }
        }

        // 2. Resolve/create primary subgroup
        let primarySubgroupId: string | null = null;
        if (row.primary_muscle_subgroup && primaryGroupId) {
          const subs = getSubgroupsForGroup(primaryGroupId);
          let sub = subs.find(s => s.name.toLowerCase() === row.primary_muscle_subgroup.toLowerCase());
          if (!sub) {
            const { data, error } = await supabase.from('muscle_subgroups').insert({ muscle_group_id: primaryGroupId, name: row.primary_muscle_subgroup, sort_order: subs.length + 1, is_active: true }).select().single();
            if (error) throw error;
            primarySubgroupId = data.id;
            createdTaxonomy.push(`Created subgroup: ${row.primary_muscle_subgroup}`);
          } else {
            primarySubgroupId = sub.id;
          }
        }

        // 3. Resolve/create equipment
        const equipmentIds: string[] = [];
        for (const eqName of row.equipment) {
          let eq = approvedEquipment.find(e => e.name.toLowerCase() === eqName.toLowerCase());
          if (!eq) {
            const { data, error } = await supabase.from('equipment').insert({ name: eqName, source: 'admin', status: 'approved', is_active: true }).select().single();
            if (error) throw error;
            equipmentIds.push(data.id);
            createdTaxonomy.push(`Created equipment: ${eqName}`);
          } else {
            equipmentIds.push(eq.id);
          }
        }

        // 4. Resolve secondary muscle entries
        const secondaryEntries: { muscle_group_id: string; muscle_subgroup_id?: string }[] = [];
        for (let si = 0; si < row.secondary_muscle_groups.length; si++) {
          const sgName = row.secondary_muscle_groups[si];
          let sg = muscleGroups.find(g => g.name.toLowerCase() === sgName.toLowerCase());
          if (!sg) {
            const { data, error } = await supabase.from('muscle_groups').insert({ name: sgName, sort_order: muscleGroups.length + secondaryEntries.length + 1, is_active: true }).select().single();
            if (error) throw error;
            sg = data as any;
            createdTaxonomy.push(`Created muscle group: ${sgName}`);
          }
          const entry: { muscle_group_id: string; muscle_subgroup_id?: string } = { muscle_group_id: sg!.id };
          
          // Check if there's a corresponding secondary subgroup
          const subName = row.secondary_muscle_subgroups[si];
          if (subName) {
            const existingSubs = getSubgroupsForGroup(sg!.id);
            let sub = existingSubs.find(s => s.name.toLowerCase() === subName.toLowerCase());
            if (!sub) {
              const { data, error } = await supabase.from('muscle_subgroups').insert({ muscle_group_id: sg!.id, name: subName, sort_order: existingSubs.length + 1, is_active: true }).select().single();
              if (error) throw error;
              entry.muscle_subgroup_id = data.id;
              createdTaxonomy.push(`Created subgroup: ${subName}`);
            } else {
              entry.muscle_subgroup_id = sub.id;
            }
          }
          secondaryEntries.push(entry);
        }

        // 5. Check for duplicate exercise
        const { data: existing } = await supabase.from('exercises')
          .select('exercise_id')
          .ilike('name', row.exercise_name)
          .eq('type', row.modality as 'strength' | 'cardio')
          .eq('record_type', row.record_type as 'weight_reps' | 'reps' | 'cardio' | 'reps_duration' | 'duration')
          .limit(1);

        if (existing && existing.length > 0) {
          // Update existing
          const { error } = await supabase.from('exercises')
            .update({
              primary_muscle_group_id: primaryGroupId,
              primary_muscle_subgroup_id: primarySubgroupId,
              instructions: row.instructions || null,
              difficulty: (row.difficulty || null) as any,
              video_url: row.video_url || null,
              image_url: row.image_primary_url || null,
              image_secondary_url: row.image_secondary_url || null,
              tags: row.tags.length > 0 ? row.tags : null,
            })
            .eq('exercise_id', existing[0].exercise_id);
          if (error) throw error;

          results.push({ rowIndex: row.rowIndex, exercise_name: row.exercise_name, success: true, exerciseId: existing[0].exercise_id, createdTaxonomy });
        } else {
          // Create new
          const exerciseId = crypto.randomUUID();
          const { data: newEx, error } = await supabase.from('exercises').insert({
            exercise_id: exerciseId,
            version: 1,
            name: row.exercise_name,
            type: row.modality as any,
            record_type: row.record_type as any,
            source: 'system',
            status: 'approved',
            is_active: true,
            primary_muscle_group_id: primaryGroupId,
            primary_muscle_subgroup_id: primarySubgroupId,
            instructions: row.instructions || null,
            difficulty: (row.difficulty || null) as any,
            video_url: row.video_url || null,
            image_url: row.image_primary_url || null,
            image_secondary_url: row.image_secondary_url || null,
            tags: row.tags.length > 0 ? row.tags : null,
            supports_weight: ['weight_reps'].includes(row.record_type),
            supports_reps: ['weight_reps', 'reps', 'reps_duration'].includes(row.record_type),
            supports_time: ['duration', 'reps_duration', 'cardio'].includes(row.record_type),
            supports_distance: row.record_type === 'cardio',
          }).select().single();
          if (error) throw error;

          // Insert equipment join
          if (equipmentIds.length > 0) {
            await supabase.from('exercise_equipment').insert(
              equipmentIds.map(eqId => ({ exercise_id: exerciseId, equipment_id: eqId }))
            );
          }

          // Insert secondary muscles
          if (secondaryEntries.length > 0) {
            await supabase.from('exercise_secondary_muscles').insert(
              secondaryEntries.map(e => ({ exercise_id: exerciseId, muscle_group_id: e.muscle_group_id, muscle_subgroup_id: e.muscle_subgroup_id || null }))
            );
          }

          results.push({ rowIndex: row.rowIndex, exercise_name: row.exercise_name, success: true, exerciseId, createdTaxonomy });
        }
      } catch (err: any) {
        results.push({ rowIndex: row.rowIndex, exercise_name: row.exercise_name, success: false, error: err.message, createdTaxonomy: [] });
      }
    }

    setImportResults(results);
    setStep('done');

    // Invalidate caches
    queryClient.invalidateQueries({ queryKey: ['exercises'] });
    queryClient.invalidateQueries({ queryKey: ['admin-exercises'] });
    queryClient.invalidateQueries({ queryKey: ['muscle-groups'] });
    queryClient.invalidateQueries({ queryKey: ['muscle-subgroups'] });
    queryClient.invalidateQueries({ queryKey: ['equipment'] });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    await logAuditEvent({
      action: 'exercise.bulk_import',
      message: `Bulk imported ${successCount} exercises (${failCount} failed), batch: ${batchId}`,
      category: 'admin',
      entityType: 'exercise_import',
      entityId: batchId,
      metadata: { successCount, failCount, totalRows: validRows.length },
    });

    toast.success(`Imported ${successCount} exercises${failCount > 0 ? `, ${failCount} failed` : ''}`);
  };

  const handleDownloadErrors = () => {
    const errorRows = importResults.filter(r => !r.success);
    if (errorRows.length === 0) return;
    const csv = 'row,exercise_name,error\n' + errorRows.map(r => `${r.rowIndex},"${r.exercise_name}","${r.error}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const okCount = parsedRows.filter(r => r.status === 'ok').length;
  const warnCount = parsedRows.filter(r => r.status === 'warning').length;
  const errCount = parsedRows.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercise Import / Export</h1>
          <p className="text-muted-foreground">Bulk import exercises via CSV with full taxonomy support</p>
        </div>
        <Button variant="outline" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 mr-2" /> Download CSV Template
        </Button>
      </div>

      {step === 'upload' && (
        <Card>
          <CardHeader><CardTitle>Upload CSV</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <label className="block">
              <div className="w-full border-2 border-dashed border-border/50 rounded-xl p-12 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <p className="font-medium">Choose CSV file</p>
                <p className="text-sm text-muted-foreground">Use the template above for best results</p>
              </div>
              <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
            </label>

            <div className="p-4 bg-muted/30 rounded-xl text-sm space-y-2">
              <p className="font-medium">CSV Columns</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <div><strong>Required:</strong> exercise_name, modality, record_type, primary_muscle_group</div>
                <div><strong>Optional:</strong> primary_muscle_subgroup, secondary_muscle_groups, equipment, instructions, tags, difficulty, video_url</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Pipe-separated for multi-values (e.g. <code>Shoulders|Triceps</code>). Missing taxonomy/equipment will be auto-created as admin-owned.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && (
        <>
          <div className="flex gap-3">
            {okCount > 0 && (
              <div className="flex-1 p-3 bg-green-500/10 rounded-xl flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">{okCount} ready</span>
              </div>
            )}
            {warnCount > 0 && (
              <div className="flex-1 p-3 bg-yellow-500/10 rounded-xl flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-600">{warnCount} warnings (will create new taxonomy)</span>
              </div>
            )}
            {errCount > 0 && (
              <div className="flex-1 p-3 bg-destructive/10 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">{errCount} errors (will skip)</span>
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Exercise Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>Primary Muscle</TableHead>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map(row => (
                      <TableRow key={row.rowIndex} className={row.status === 'error' ? 'bg-destructive/5' : row.status === 'warning' ? 'bg-yellow-500/5' : ''}>
                        <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                        <TableCell>
                          {row.status === 'ok' && <Badge variant="default" className="bg-green-600">OK</Badge>}
                          {row.status === 'warning' && <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Warn</Badge>}
                          {row.status === 'error' && <Badge variant="destructive">Error</Badge>}
                        </TableCell>
                        <TableCell className="font-medium">{row.exercise_name || '—'}</TableCell>
                        <TableCell className="capitalize">{row.modality}</TableCell>
                        <TableCell className="text-xs">{row.record_type}</TableCell>
                        <TableCell className="text-sm">{row.primary_muscle_group}{row.primary_muscle_subgroup ? ` → ${row.primary_muscle_subgroup}` : ''}</TableCell>
                        <TableCell className="text-sm">{row.equipment.join(', ') || '—'}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {row.messages.map((m, i) => <p key={i} className="text-xs text-destructive">{m}</p>)}
                            {row.willCreate.map((m, i) => <p key={i} className="text-xs text-yellow-600">{m}</p>)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => { setParsedRows([]); setStep('upload'); }}>
              <RotateCcw className="h-4 w-4 mr-2" /> Start Over
            </Button>
            <Button onClick={handleImport} disabled={okCount + warnCount === 0}>
              <Upload className="h-4 w-4 mr-2" /> Import {okCount + warnCount} Exercises
            </Button>
          </div>
        </>
      )}

      {step === 'importing' && (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h3 className="text-lg font-medium">Importing exercises...</h3>
            <p className="text-muted-foreground">Creating taxonomy and exercises. This may take a moment.</p>
          </CardContent>
        </Card>
      )}

      {step === 'done' && (
        <>
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">{importResults.filter(r => r.success).length} exercises imported</p>
                {importResults.filter(r => !r.success).length > 0 && (
                  <p className="text-sm text-destructive">{importResults.filter(r => !r.success).length} failed</p>
                )}
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setParsedRows([]); setImportResults([]); setStep('upload'); }}>
                  Import More
                </Button>
                {importResults.some(r => !r.success) && (
                  <Button variant="outline" onClick={handleDownloadErrors}>
                    <Download className="h-4 w-4 mr-2" /> Download Errors CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results table */}
          <Card>
            <CardHeader><CardTitle>Import Results</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercise</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Taxonomy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.exercise_name}</TableCell>
                        <TableCell>
                          {r.success ? <Badge variant="default" className="bg-green-600">OK</Badge> : <Badge variant="destructive">{r.error}</Badge>}
                        </TableCell>
                        <TableCell>
                          {r.createdTaxonomy.length > 0 ? (
                            <div className="space-y-0.5">
                              {r.createdTaxonomy.map((t, ti) => <Badge key={ti} variant="outline" className="text-xs mr-1">{t}</Badge>)}
                            </div>
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
