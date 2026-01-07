import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  Briefcase,
  DollarSign,
  Globe,
  MapPin,
  Layers
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Coach {
  id: string;
  display_name: string;
}

interface Service {
  id: string;
  name: string;
  description: string | null;
  delivery_type: string;
  price: number | null;
  billing_cycle: string | null;
  is_active: boolean;
}

const emptyService: Omit<Service, "id"> = {
  name: "",
  description: "",
  delivery_type: "remote",
  price: null,
  billing_cycle: "monthly",
  is_active: true,
};

export default function CoachServices() {
  const { coach } = useOutletContext<{ coach: Coach }>();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<Omit<Service, "id">>(emptyService);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coach?.id) {
      fetchServices();
    }
  }, [coach?.id]);

  const fetchServices = async () => {
    if (!coach?.id) return;

    const { data, error } = await supabase
      .from("coach_services")
      .select("*")
      .eq("coach_id", coach.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching services:", error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const openCreateDialog = () => {
    setEditingService(null);
    setFormData(emptyService);
    setDialogOpen(true);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description,
      delivery_type: service.delivery_type,
      price: service.price,
      billing_cycle: service.billing_cycle,
      is_active: service.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!coach?.id || !formData.name.trim()) {
      toast.error("Service name is required");
      return;
    }

    setSaving(true);

    if (editingService) {
      const { error } = await supabase
        .from("coach_services")
        .update(formData)
        .eq("id", editingService.id);

      if (error) {
        toast.error("Failed to update service");
      } else {
        toast.success("Service updated");
        fetchServices();
      }
    } else {
      const { error } = await supabase
        .from("coach_services")
        .insert({ ...formData, coach_id: coach.id });

      if (error) {
        toast.error("Failed to create service");
      } else {
        toast.success("Service created");
        fetchServices();
      }
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("coach_services")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete service");
    } else {
      toast.success("Service deleted");
      setServices(services.filter((s) => s.id !== id));
    }
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from("coach_services")
      .update({ is_active: !service.is_active })
      .eq("id", service.id);

    if (error) {
      toast.error("Failed to update service");
    } else {
      setServices(
        services.map((s) =>
          s.id === service.id ? { ...s, is_active: !s.is_active } : s
        )
      );
    }
  };

  const getDeliveryIcon = (type: string) => {
    switch (type) {
      case "in_person":
        return <MapPin className="h-4 w-4" />;
      case "remote":
        return <Globe className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  const getDeliveryLabel = (type: string) => {
    switch (type) {
      case "in_person":
        return "In-Person";
      case "remote":
        return "Remote";
      default:
        return "Hybrid";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-semibold">Services</h2>
          <p className="text-muted-foreground mt-1">
            Define your coaching offerings
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </motion.div>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {services.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className={!service.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{service.name}</CardTitle>
                        {!service.is_active && (
                          <Badge variant="secondary" className="mt-1">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(service)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(service)}>
                          {service.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(service.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      {getDeliveryIcon(service.delivery_type)}
                      <span>{getDeliveryLabel(service.delivery_type)}</span>
                    </div>
                    {service.price && (
                      <div className="flex items-center gap-1 font-medium">
                        <DollarSign className="h-4 w-4" />
                        {service.price}
                        {service.billing_cycle && (
                          <span className="text-muted-foreground font-normal">
                            /{service.billing_cycle === "one_time" ? "once" : service.billing_cycle?.replace("ly", "")}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {services.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full"
          >
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-medium mb-1">No services yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first coaching service
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingService ? "Edit Service" : "Create Service"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Service Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., 1-on-1 Coaching"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what this service includes..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Type</Label>
                <Select
                  value={formData.delivery_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, delivery_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="in_person">In-Person</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select
                  value={formData.billing_cycle || "monthly"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, billing_cycle: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-Time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={formData.price || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="0"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">
                  Make this service available for new clients
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingService ? "Save Changes" : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}