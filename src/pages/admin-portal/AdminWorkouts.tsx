import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MoreHorizontal, Download, Eye, Copy, FileJson, Dumbbell, Calendar, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DIFFICULTY_LABELS, WORKOUT_TYPE_LABELS, type WorkoutTemplate, type WorkoutTemplateExercise, type TrainingSplit } from "@/types/workout-templates";

export default function AdminWorkouts() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"workouts" | "splits">("workouts");

  // Fetch workout templates
  const { data: workouts = [], isLoading: workoutsLoading } = useQuery({
    queryKey: ['admin-workout-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        exercise_data: Array.isArray(t.exercise_data) 
          ? (t.exercise_data as unknown as WorkoutTemplateExercise[])
          : [],
      })) as WorkoutTemplate[];
    },
  });

  // Fetch training splits
  const { data: splits = [], isLoading: splitsLoading } = useQuery({
    queryKey: ['admin-training-splits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_splits')
        .select(`
          *,
          split_weeks (
            id,
            split_workouts (id)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as (TrainingSplit & { split_weeks: { id: string; split_workouts: { id: string }[] }[] })[];
    },
  });

  const filteredWorkouts = workouts.filter(
    (w) => w.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSplits = splits.filter(
    (s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getExerciseCount = (template: WorkoutTemplate) => {
    return Array.isArray(template.exercise_data) ? template.exercise_data.length : 0;
  };

  const getTotalWorkouts = (split: TrainingSplit & { split_weeks: { split_workouts: { id: string }[] }[] }) => {
    return split.split_weeks?.reduce((acc, week) => acc + (week.split_workouts?.length || 0), 0) || 0;
  };

  const getStatusBadge = (status: string, isCurated: boolean) => {
    if (isCurated) {
      return <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">Curated</Badge>;
    }
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="text-primary border-primary">Approved</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="text-muted-foreground border-muted-foreground">Pending</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-destructive border-destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Private</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts & Programs</h1>
          <p className="text-muted-foreground">Manage workout templates and training splits</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <FileJson className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "workouts" | "splits")}>
        <TabsList>
          <TabsTrigger value="workouts" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            Workout Templates ({workouts.length})
          </TabsTrigger>
          <TabsTrigger value="splits" className="gap-2">
            <Calendar className="h-4 w-4" />
            Training Splits ({splits.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workouts">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workoutsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Exercises</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No workout templates found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWorkouts.map((workout) => (
                        <TableRow key={workout.id}>
                          <TableCell className="font-medium">{workout.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {WORKOUT_TYPE_LABELS[workout.workout_type] || workout.workout_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {workout.difficulty_level ? DIFFICULTY_LABELS[workout.difficulty_level] : '—'}
                          </TableCell>
                          <TableCell>{getExerciseCount(workout)}</TableCell>
                          <TableCell>{getStatusBadge(workout.status, workout.is_curated)}</TableCell>
                          <TableCell>{workout.use_count}</TableCell>
                          <TableCell>{new Date(workout.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/train/workout/${workout.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/train/workout/${workout.id}/edit`)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="splits">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search splits..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {splitsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Split Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Weeks</TableHead>
                      <TableHead>Workouts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSplits.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No training splits found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSplits.map((split) => (
                        <TableRow key={split.id}>
                          <TableCell className="font-medium">{split.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {WORKOUT_TYPE_LABELS[split.workout_type] || split.workout_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {split.difficulty_level ? DIFFICULTY_LABELS[split.difficulty_level] : '—'}
                          </TableCell>
                          <TableCell>{split.weeks_count || '—'}</TableCell>
                          <TableCell>{getTotalWorkouts(split)}</TableCell>
                          <TableCell>{getStatusBadge(split.status, split.is_curated)}</TableCell>
                          <TableCell>{split.use_count}</TableCell>
                          <TableCell>{new Date(split.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => navigate(`/train/split/${split.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/train/split/${split.id}/edit`)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
