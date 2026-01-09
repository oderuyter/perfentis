import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreHorizontal, Download, Upload, Eye, Edit, Archive, Plus } from "lucide-react";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { toast } from "sonner";

export default function AdminExercises() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: exercises = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-exercises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredExercises = exercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || ex.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDeprecate = async (exerciseId: string, name: string) => {
    const { error } = await supabase
      .from("exercises")
      .update({ is_active: false })
      .eq("id", exerciseId);

    if (error) {
      toast.error("Failed to deprecate exercise");
      return;
    }

    await logAuditEvent({
      action: "exercise.deprecated",
      message: `Exercise "${name}" was deprecated`,
      category: "admin",
      severity: "warn",
      entityType: "exercise",
      entityId: exerciseId,
    });

    toast.success("Exercise deprecated");
    refetch();
  };

  const handleExportCSV = () => {
    const headers = ["name", "type", "primary_muscle", "equipment", "is_active"];
    const csvContent = [
      headers.join(","),
      ...exercises.map((ex) =>
        [
          `"${ex.name}"`,
          ex.type,
          ex.primary_muscle || "",
          (ex.equipment || []).join("|"),
          ex.is_active,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exercises_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercise Library</h1>
          <p className="text-muted-foreground">Manage system exercises</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exercises..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="cardio">Cardio</SelectItem>
                <SelectItem value="flexibility">Flexibility</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Primary Muscle</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {exercise.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {exercise.primary_muscle?.replace(/_/g, " ") || "-"}
                    </TableCell>
                    <TableCell>
                      {(exercise.equipment || []).slice(0, 2).map((eq) => (
                        <Badge key={eq} variant="secondary" className="mr-1 text-xs">
                          {eq}
                        </Badge>
                      ))}
                      {(exercise.equipment || []).length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{(exercise.equipment || []).length - 2}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={exercise.is_active ? "default" : "secondary"}>
                        {exercise.is_active ? "Active" : "Deprecated"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {exercise.is_active && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeprecate(exercise.id, exercise.name)}
                            >
                              <Archive className="h-4 w-4 mr-2" />
                              Deprecate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
