import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Calendar,
  Users,
  Copy,
  Edit,
  Trash2,
  ChevronRight,
  Dumbbell,
  MoreVertical,
  UserPlus,
  Settings,
  FileUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTrainingPlans, useCoachClients } from "@/hooks/useCoach";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { WorkoutExerciseEditor } from "@/components/coach/WorkoutExerciseEditor";

interface Coach {
  id: string;
  display_name: string;
}

interface PlanWeek {
  id: string;
  week_number: number;
  name: string | null;
  notes: string | null;
  plan_workouts: PlanWorkout[];
}

interface PlanWorkout {
  id: string;
  name: string;
  description: string | null;
  day_of_week: number | null;
  order_index: number;
  coach_notes: string | null;
  exercise_data: any;
}

export default function CoachPlans() {
  const navigate = useNavigate();
  const { coach } = useOutletContext<{ coach: Coach }>();
  const { plans, isLoading, refetch } = useTrainingPlans(coach?.id);
  const { clients } = useCoachClients(coach?.id);

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("templates");

  // Workout exercise editor state
  const [showExerciseEditor, setShowExerciseEditor] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<PlanWorkout | null>(null);

  // Form state
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planType, setPlanType] = useState("workout");
  const [durationWeeks, setDurationWeeks] = useState("4");
  const [saving, setSaving] = useState(false);

  // Assignment state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [startDate, setStartDate] = useState("");

  const templates = plans.filter((p) => p.is_template);
  const assignedPlans = plans.filter((p) => !p.is_template);

  const resetForm = () => {
    setPlanName("");
    setPlanDescription("");
    setPlanType("workout");
    setDurationWeeks("4");
  };

  const handleCreatePlan = async () => {
    if (!planName.trim() || !coach) return;

    setSaving(true);
    try {
      // Create the plan
      const { data: plan, error: planError } = await supabase
        .from("training_plans")
        .insert({
          coach_id: coach.id,
          name: planName.trim(),
          description: planDescription.trim() || null,
          plan_type: planType,
          duration_weeks: parseInt(durationWeeks),
          is_template: true,
          is_active: true,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create weeks for the plan
      const weeks = Array.from({ length: parseInt(durationWeeks) }, (_, i) => ({
        plan_id: plan.id,
        week_number: i + 1,
        name: `Week ${i + 1}`,
      }));

      const { error: weeksError } = await supabase
        .from("plan_weeks")
        .insert(weeks);

      if (weeksError) throw weeksError;

      toast.success("Plan created successfully");
      setShowCreateSheet(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error("Error creating plan:", error);
      toast.error("Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (!planName.trim() || !selectedPlan) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("training_plans")
        .update({
          name: planName.trim(),
          description: planDescription.trim() || null,
          plan_type: planType,
          duration_weeks: parseInt(durationWeeks),
        })
        .eq("id", selectedPlan.id);

      if (error) throw error;

      toast.success("Plan updated successfully");
      setShowEditSheet(false);
      refetch();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedPlan) return;

    try {
      const { error } = await supabase
        .from("training_plans")
        .delete()
        .eq("id", selectedPlan.id);

      if (error) throw error;

      toast.success("Plan deleted successfully");
      setShowDeleteDialog(false);
      setSelectedPlan(null);
      refetch();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  const handleDuplicatePlan = async (plan: any) => {
    try {
      // Create new plan
      const { data: newPlan, error: planError } = await supabase
        .from("training_plans")
        .insert({
          coach_id: coach.id,
          name: `${plan.name} (Copy)`,
          description: plan.description,
          plan_type: plan.plan_type,
          duration_weeks: plan.duration_weeks,
          is_template: true,
          is_active: true,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Copy weeks
      if (plan.plan_weeks?.length > 0) {
        for (const week of plan.plan_weeks) {
          const { data: newWeek, error: weekError } = await supabase
            .from("plan_weeks")
            .insert({
              plan_id: newPlan.id,
              week_number: week.week_number,
              name: week.name,
              notes: week.notes,
            })
            .select()
            .single();

          if (weekError) throw weekError;

          // Copy workouts
          if (week.plan_workouts?.length > 0) {
            const workouts = week.plan_workouts.map((w: PlanWorkout) => ({
              week_id: newWeek.id,
              name: w.name,
              description: w.description,
              day_of_week: w.day_of_week,
              order_index: w.order_index,
              coach_notes: w.coach_notes,
              exercise_data: w.exercise_data,
            }));

            const { error: workoutsError } = await supabase
              .from("plan_workouts")
              .insert(workouts);

            if (workoutsError) throw workoutsError;
          }
        }
      }

      toast.success("Plan duplicated successfully");
      refetch();
    } catch (error) {
      console.error("Error duplicating plan:", error);
      toast.error("Failed to duplicate plan");
    }
  };

  const handleAssignPlan = async () => {
    if (!selectedPlan || !selectedClientId || !startDate) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("client_plan_assignments").insert({
        client_id: selectedClientId,
        plan_id: selectedPlan.id,
        start_date: startDate,
        status: "active",
      });

      if (error) throw error;

      toast.success("Plan assigned to client");
      setShowAssignSheet(false);
      setSelectedClientId("");
      setStartDate("");
      refetch();
    } catch (error) {
      console.error("Error assigning plan:", error);
      toast.error("Failed to assign plan");
    } finally {
      setSaving(false);
    }
  };

  const openEditSheet = (plan: any) => {
    setSelectedPlan(plan);
    setPlanName(plan.name);
    setPlanDescription(plan.description || "");
    setPlanType(plan.plan_type);
    setDurationWeeks(plan.duration_weeks?.toString() || "4");
    setShowEditSheet(true);
  };

  const openAssignSheet = (plan: any) => {
    setSelectedPlan(plan);
    setShowAssignSheet(true);
  };

  const handleAddWorkout = async (weekId: string, currentCount: number) => {
    try {
      const { data: newWorkout, error } = await supabase
        .from("plan_workouts")
        .insert({
          week_id: weekId,
          name: `Workout ${currentCount + 1}`,
          order_index: currentCount,
          exercise_data: [],
        })
        .select()
        .single();

      if (error) throw error;

      // Open the exercise editor for the new workout
      setSelectedWorkout(newWorkout);
      setShowExerciseEditor(true);
      refetch();
    } catch (error) {
      console.error("Error adding workout:", error);
      toast.error("Failed to add workout");
    }
  };

  const getDayName = (day: number | null) => {
    if (day === null) return "Unscheduled";
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[day] || "Unscheduled";
  };

  const activeClients = clients.filter((c) => c.status === "active");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Plans & Programs</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/import?context=coach&coachId=${coach.id}&returnTo=/coach-portal/plans`)}>
            <FileUp className="h-4 w-4 mr-2" />
            Import Plan
          </Button>
          <Button onClick={() => setShowCreateSheet(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Plan
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="assigned">
            Assigned ({assignedPlans.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          {templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No Plan Templates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create training plan templates to assign to clients
                </p>
                <Button onClick={() => setShowCreateSheet(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditSheet(plan)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicatePlan(plan)}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAssignSheet(plan)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign to Client
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{plan.plan_type}</Badge>
                      <Badge variant="outline">
                        {plan.duration_weeks} week
                        {plan.duration_weeks !== 1 ? "s" : ""}
                      </Badge>
                      <Badge variant="outline">v{plan.version}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {plan.plan_weeks
                        ?.sort(
                          (a: PlanWeek, b: PlanWeek) =>
                            a.week_number - b.week_number
                        )
                        .map((week: PlanWeek) => (
                          <AccordionItem
                            key={week.id}
                            value={week.id}
                            className="border-none"
                          >
                            <AccordionTrigger className="py-2 hover:no-underline">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {week.name || `Week ${week.week_number}`}
                                </span>
                                <Badge variant="secondary" className="ml-2">
                                  {week.plan_workouts?.length || 0} workouts
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-2 pl-6">
                                {week.plan_workouts?.length > 0 && week.plan_workouts
                                  .sort(
                                    (a: PlanWorkout, b: PlanWorkout) =>
                                      a.order_index - b.order_index
                                  )
                                  .map((workout: PlanWorkout) => {
                                    const exerciseCount = Array.isArray(workout.exercise_data) 
                                      ? workout.exercise_data.length 
                                      : 0;
                                    return (
                                      <div
                                        key={workout.id}
                                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group"
                                      >
                                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">
                                            {workout.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}
                                            {workout.description && ` • ${workout.description}`}
                                          </p>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedWorkout(workout);
                                            setShowExerciseEditor(true);
                                          }}
                                        >
                                          <Settings className="h-3.5 w-3.5 mr-1" />
                                          Edit
                                        </Button>
                                        <Badge variant="outline" className="text-xs">
                                          {getDayName(workout.day_of_week)}
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddWorkout(week.id, week.plan_workouts?.length || 0);
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Workout
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assigned" className="mt-4">
          {assignedPlans.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No Assigned Plans</h3>
                <p className="text-sm text-muted-foreground">
                  Assign a template to a client to create an active plan
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {assignedPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{plan.plan_type}</Badge>
                      <Badge variant="outline">
                        {plan.duration_weeks} weeks
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Plan Sheet */}
      <Sheet open={showCreateSheet} onOpenChange={setShowCreateSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Create Training Plan</SheetTitle>
            <SheetDescription>
              Create a new training plan template to assign to clients
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="e.g., 12-Week Strength Program"
              />
            </div>
            <div>
              <Label htmlFor="planDescription">Description</Label>
              <Textarea
                id="planDescription"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                placeholder="Describe the program goals and structure..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="planType">Plan Type</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workout">Workout Program</SelectItem>
                  <SelectItem value="habit">Habit Plan</SelectItem>
                  <SelectItem value="combined">Combined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="durationWeeks">Duration (weeks)</Label>
              <Select value={durationWeeks} onValueChange={setDurationWeeks}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24].map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      {w} week{w !== 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateSheet(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreatePlan}
                disabled={!planName.trim() || saving}
                className="flex-1"
              >
                {saving ? "Creating..." : "Create Plan"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Plan Sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Plan</SheetTitle>
            <SheetDescription>
              Update the plan details. Changes create a new version.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="editPlanName">Plan Name *</Label>
              <Input
                id="editPlanName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="editPlanDescription">Description</Label>
              <Textarea
                id="editPlanDescription"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="editPlanType">Plan Type</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workout">Workout Program</SelectItem>
                  <SelectItem value="habit">Habit Plan</SelectItem>
                  <SelectItem value="combined">Combined</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="editDurationWeeks">Duration (weeks)</Label>
              <Select value={durationWeeks} onValueChange={setDurationWeeks}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24].map((w) => (
                    <SelectItem key={w} value={w.toString()}>
                      {w} week{w !== 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditSheet(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePlan}
                disabled={!planName.trim() || saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Assign Plan Sheet */}
      <Sheet open={showAssignSheet} onOpenChange={setShowAssignSheet}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Assign Plan to Client</SheetTitle>
            <SheetDescription>
              {selectedPlan?.name}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div>
              <Label htmlFor="clientSelect">Select Client *</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.profiles?.display_name || "Unnamed Client"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeClients.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  No active clients. Invite clients first.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAssignSheet(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignPlan}
                disabled={!selectedClientId || !startDate || saving}
                className="flex-1"
              >
                {saving ? "Assigning..." : "Assign Plan"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedPlan?.name}"? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Workout Exercise Editor */}
      <WorkoutExerciseEditor
        open={showExerciseEditor}
        onOpenChange={setShowExerciseEditor}
        workoutId={selectedWorkout?.id || ''}
        workoutName={selectedWorkout?.name || ''}
        initialExerciseData={
          Array.isArray(selectedWorkout?.exercise_data) 
            ? selectedWorkout.exercise_data 
            : []
        }
        onSave={() => refetch()}
      />
    </div>
  );
}
