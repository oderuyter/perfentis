import { useState } from "react";
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
import { Search, MoreHorizontal, Download, Eye, Copy, FileJson } from "lucide-react";

// Placeholder data
const mockWorkouts = [
  { id: "1", name: "Full Body Strength", type: "strength", exercises: 8, usedIn: 12, createdAt: "2024-01-15" },
  { id: "2", name: "HIIT Cardio Blast", type: "cardio", exercises: 6, usedIn: 8, createdAt: "2024-01-10" },
  { id: "3", name: "Upper Body Push", type: "strength", exercises: 5, usedIn: 15, createdAt: "2024-01-05" },
];

export default function AdminWorkouts() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredWorkouts = mockWorkouts.filter(
    (w) => w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workouts & Programs</h1>
          <p className="text-muted-foreground">Manage system workout templates</p>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Exercises</TableHead>
                <TableHead>Used In</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkouts.map((workout) => (
                <TableRow key={workout.id}>
                  <TableCell className="font-medium">{workout.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {workout.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{workout.exercises}</TableCell>
                  <TableCell>{workout.usedIn} programs</TableCell>
                  <TableCell>{new Date(workout.createdAt).toLocaleDateString()}</TableCell>
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
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
