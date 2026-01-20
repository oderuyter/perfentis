import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Users, Building2, Calendar, Dumbbell, MessageSquare, Trash2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SeedSummary {
  usersCreated: number;
  usersUpdated: number;
  gymsCreated: number;
  eventsCreated: number;
  workoutsCreated: number;
  messagesCreated: number;
  errors: string[];
}

interface CleanupSummary {
  entitiesRemoved: Record<string, number>;
  usersDeleted: number;
  errors: string[];
  message?: string;
}

export default function DemoDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedSummary | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupSummary | null>(null);
  
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [cleanupConfirmText, setCleanupConfirmText] = useState("");
  const [hardDeleteUsers, setHardDeleteUsers] = useState(false);
  const [cleanupScope, setCleanupScope] = useState<string>("all");

  const handleSeedDemoData = async () => {
    setShowSeedConfirm(false);
    setIsSeeding(true);
    setSeedResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke('seed-demo-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        setSeedResult(result.summary);
        toast.success("Demo data seeded successfully!");
      } else {
        toast.error(result.error || "Failed to seed demo data");
      }
    } catch (error: any) {
      console.error("Seed error:", error);
      toast.error(error.message || "Failed to seed demo data");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCleanupDemoData = async () => {
    if (cleanupConfirmText !== "RESET DEMO DATA") {
      toast.error("Please type RESET DEMO DATA to confirm");
      return;
    }

    setShowCleanupConfirm(false);
    setIsCleaning(true);
    setCleanupResult(null);
    setCleanupConfirmText("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        return;
      }

      const response = await supabase.functions.invoke('cleanup-demo-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          hardDelete: hardDeleteUsers,
          scope: cleanupScope
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        setCleanupResult(result.summary);
        toast.success("Demo data cleaned up successfully!");
      } else {
        toast.error(result.error || "Failed to cleanup demo data");
      }
    } catch (error: any) {
      console.error("Cleanup error:", error);
      toast.error(error.message || "Failed to cleanup demo data");
    } finally {
      setIsCleaning(false);
      setHardDeleteUsers(false);
    }
  };

  const demoUsers = [
    { email: "oderuyter+aioadmin@gmail.com", name: "Demo Admin", role: "Admin" },
    { email: "oderuyter+aioathlete1@gmail.com", name: "Demo Athlete 1", role: "Athlete" },
    { email: "oderuyter+aioathlete2@gmail.com", name: "Demo Athlete 2", role: "Athlete" },
    { email: "oderuyter+aiogymmanager@gmail.com", name: "Demo Gym Manager", role: "Gym Manager" },
    { email: "oderuyter+aiogymstaff@gmail.com", name: "Demo Gym Staff", role: "Gym Staff" },
    { email: "oderuyter+aiogymmember@gmail.com", name: "Demo Gym Member", role: "Gym Member" },
    { email: "oderuyter+aiocoach@gmail.com", name: "Demo Coach", role: "Coach" },
    { email: "oderuyter+aioclient1@gmail.com", name: "Demo Client Active", role: "Coach Client" },
    { email: "oderuyter+aioclient2@gmail.com", name: "Demo Client Paused", role: "Coach Client" },
    { email: "oderuyter+aiocoachlead@gmail.com", name: "Demo Coaching Lead", role: "Lead" },
    { email: "oderuyter+aioorganiser@gmail.com", name: "Demo Event Organiser", role: "Event Organiser" },
    { email: "oderuyter+aioeventmember1@gmail.com", name: "Demo Event Member", role: "Event Member" },
    { email: "oderuyter+aioteamlead@gmail.com", name: "Demo Team Leader", role: "Team Leader" },
    { email: "oderuyter+aioteammember@gmail.com", name: "Demo Team Member", role: "Team Member" },
    { email: "oderuyter+aiovolunteer@gmail.com", name: "Demo Volunteer", role: "Volunteer" },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle>Demo Data Seeder</CardTitle>
          </div>
          <CardDescription>
            Create and manage test data for development and staging environments. 
            All demo users use Gmail plus-addressing with the base email: <code className="text-xs bg-muted px-1 rounded">oderuyter@gmail.com</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => setShowSeedConfirm(true)} 
              disabled={isSeeding || isCleaning}
            >
              {isSeeding ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Seeding...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Create / Update Demo Data</>
              )}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => setShowCleanupConfirm(true)}
              disabled={isSeeding || isCleaning}
            >
              {isCleaning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cleaning...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Reset / Cleanup Demo Data</>
              )}
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Default Password</AlertTitle>
            <AlertDescription>
              All demo users are created with the password: <code className="bg-muted px-1 rounded">DemoPass123!</code>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Results Cards */}
      {seedResult && (
        <Card className="border-green-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle className="text-green-600">Seed Complete</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Users Created</p>
                  <p className="text-lg font-semibold">{seedResult.usersCreated}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Users Updated</p>
                  <p className="text-lg font-semibold">{seedResult.usersUpdated}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Gyms</p>
                  <p className="text-lg font-semibold">{seedResult.gymsCreated}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Events</p>
                  <p className="text-lg font-semibold">{seedResult.eventsCreated}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Workouts</p>
                  <p className="text-lg font-semibold">{seedResult.workoutsCreated}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Messages</p>
                  <p className="text-lg font-semibold">{seedResult.messagesCreated}</p>
                </div>
              </div>
            </div>
            {seedResult.errors.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-destructive mb-2">Errors ({seedResult.errors.length}):</p>
                <ul className="text-sm text-destructive list-disc list-inside">
                  {seedResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {seedResult.errors.length > 5 && (
                    <li>...and {seedResult.errors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cleanupResult && (
        <Card className="border-orange-500/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-orange-600">Cleanup Complete</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {cleanupResult.message ? (
              <p className="text-muted-foreground">{cleanupResult.message}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(cleanupResult.entitiesRemoved).map(([type, count]) => (
                    <Badge key={type} variant="secondary">
                      {type}: {count}
                    </Badge>
                  ))}
                  {cleanupResult.usersDeleted > 0 && (
                    <Badge variant="destructive">
                      Users Deleted: {cleanupResult.usersDeleted}
                    </Badge>
                  )}
                </div>
                {cleanupResult.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-destructive mb-2">Errors ({cleanupResult.errors.length}):</p>
                    <ul className="text-sm text-destructive list-disc list-inside">
                      {cleanupResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demo Users Reference */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Demo Users Reference</CardTitle>
          </div>
          <CardDescription>
            All demo users that will be created or updated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {demoUsers.map((user) => (
                <div key={user.email} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline">{user.role}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Seed Confirmation Dialog */}
      <Dialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create / Update Demo Data?</DialogTitle>
            <DialogDescription>
              This will create or update 15 demo users and their associated data including gyms, coaches, events, workouts, and messages.
              This operation is idempotent and safe to run multiple times.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">The following will be created/updated:</p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1">
              <li>15 demo users with various roles</li>
              <li>1 demo gym with membership levels</li>
              <li>1 demo coach with services and training plans</li>
              <li>1 demo event with registrations</li>
              <li>Sample workout sessions and personal records</li>
              <li>Sample conversations and notifications</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeedConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSeedDemoData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Seed Demo Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cleanup Confirmation Dialog */}
      <Dialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reset Demo Data
            </DialogTitle>
            <DialogDescription>
              This will remove all data created by the demo seeder. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cleanup Scope</Label>
              <Select value={cleanupScope} onValueChange={setCleanupScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Demo Data</SelectItem>
                  <SelectItem value="messaging">Messaging Only</SelectItem>
                  <SelectItem value="events">Events Only</SelectItem>
                  <SelectItem value="coach">Coach Data Only</SelectItem>
                  <SelectItem value="gym">Gym Data Only</SelectItem>
                  <SelectItem value="workouts">Workouts Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hardDelete" 
                checked={hardDeleteUsers}
                onCheckedChange={(checked) => setHardDeleteUsers(checked as boolean)}
              />
              <Label htmlFor="hardDelete" className="text-sm text-destructive">
                Also delete demo users (hard delete)
              </Label>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Type <code className="text-xs bg-muted px-1 rounded">RESET DEMO DATA</code> to confirm</Label>
              <Input 
                value={cleanupConfirmText}
                onChange={(e) => setCleanupConfirmText(e.target.value)}
                placeholder="RESET DEMO DATA"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCleanupConfirm(false);
              setCleanupConfirmText("");
              setHardDeleteUsers(false);
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCleanupDemoData}
              disabled={cleanupConfirmText !== "RESET DEMO DATA"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Demo Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}