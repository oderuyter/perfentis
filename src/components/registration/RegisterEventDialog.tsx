import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Loader2, Flag, MapPin, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RegisterEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Gym {
  id: string;
  name: string;
  address: string | null;
}

interface EventCategory {
  id: string;
  name: string;
  description: string | null;
}

const EVENT_MODES = [
  { value: "in_person", label: "In-Person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export function RegisterEventDialog({ open, onOpenChange }: RegisterEventDialogProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [gymSearchOpen, setGymSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    categoryId: "",
    eventMode: "",
    startDate: "",
    endDate: "",
    location: "",
    gymId: "",
    reason: "",
  });

  useEffect(() => {
    if (open) {
      fetchGyms();
      fetchCategories();
    }
  }, [open]);

  const fetchGyms = async () => {
    const { data } = await supabase
      .from("gyms")
      .select("id, name, address")
      .eq("status", "active")
      .order("name");
    setGyms(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("event_categories")
      .select("id, name, description")
      .eq("is_active", true)
      .order("display_order");
    setCategories(data || []);
  };

  const handleGymSelect = (gymId: string) => {
    const selectedGym = gyms.find(g => g.id === gymId);
    if (selectedGym) {
      setFormData(prev => ({
        ...prev,
        gymId: gymId,
        location: selectedGym.address || selectedGym.name,
      }));
    }
    setGymSearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to register an event");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Event name is required");
      return;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for registration");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("registration_requests").insert({
        request_type: "event",
        user_id: user.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        reason: formData.reason.trim(),
        event_type: formData.categoryId || null, // Using category as event_type for now
        event_mode: formData.eventMode || null,
        event_start_date: formData.startDate || null,
        event_end_date: formData.endDate || null,
        event_location: formData.location.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Event registration submitted! You'll be notified once reviewed.");
      onOpenChange(false);
      setFormData({
        name: "",
        description: "",
        categoryId: "",
        eventMode: "",
        startDate: "",
        endDate: "",
        location: "",
        gymId: "",
        reason: "",
      });
    } catch (error: any) {
      console.error("Error submitting registration:", error);
      toast.error(error.message || "Failed to submit registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[90vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Register an Event
          </SheetTitle>
          <SheetDescription>
            Submit your event for review. Once approved, you'll be able to manage it from the Event Portal.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-name">Event Name *</Label>
            <Input
              id="event-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter event name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description">Description</Label>
            <Textarea
              id="event-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your event, including what participants can expect..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Event Category</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Event Mode</Label>
              <Select
                value={formData.eventMode}
                onValueChange={(value) => setFormData({ ...formData, eventMode: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode..." />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Venue / Location</Label>
            <Popover open={gymSearchOpen} onOpenChange={setGymSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={gymSearchOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.gymId ? (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {gyms.find(g => g.id === formData.gymId)?.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Search gyms or enter manually...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search gyms..." />
                  <CommandList>
                    <CommandEmpty>No gyms found.</CommandEmpty>
                    <CommandGroup>
                      {gyms.map((gym) => (
                        <CommandItem
                          key={gym.id}
                          value={gym.name}
                          onSelect={() => handleGymSelect(gym.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.gymId === gym.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div>
                            <p className="font-medium">{gym.name}</p>
                            {gym.address && (
                              <p className="text-xs text-muted-foreground">{gym.address}</p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value, gymId: "" })}
              placeholder="Or enter address manually"
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Registration *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Tell us about your event and why you want to host it on our platform..."
              rows={3}
            />
          </div>

          <SheetFooter className="pb-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Registration
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
