import { useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, Eye, Edit, Trash2, Star, StarOff, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAdminOffers, useUpdateOffer, useDeleteOffer, useOfferCategories, type Offer } from "@/hooks/useOffers";
import { toast } from "sonner";
import { AdminOfferForm } from "@/components/admin/AdminOfferForm";

export default function AdminRewards() {
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'disabled' | undefined>(undefined);
  const [scopeFilter, setScopeFilter] = useState<'global' | 'gym' | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const { data: offers, isLoading } = useAdminOffers({ status: statusFilter, scope: scopeFilter });
  const { data: categories } = useOfferCategories();
  const { mutate: updateOffer } = useUpdateOffer();
  const { mutate: deleteOffer } = useDeleteOffer();
  
  const filteredOffers = offers?.filter(o => 
    !search || 
    o.title.toLowerCase().includes(search.toLowerCase()) || 
    o.brand_name.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleToggleFeatured = (offer: Offer) => {
    updateOffer({ id: offer.id, featured: !offer.featured });
  };
  
  const handleArchive = (offer: Offer) => {
    updateOffer({ id: offer.id, status: 'archived' as const });
  };
  
  const handleRestore = (offer: Offer) => {
    updateOffer({ id: offer.id, status: 'active' as const });
  };
  
  const handleDelete = (offer: Offer) => {
    if (confirm('Are you sure you want to delete this offer?')) {
      deleteOffer(offer.id);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rewards & Discounts</h1>
          <p className="text-muted-foreground">Manage offers and discounts</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Offer
        </Button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{offers?.filter(o => o.status === 'active').length || 0}</div>
            <p className="text-sm text-muted-foreground">Active Offers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{offers?.filter(o => o.featured).length || 0}</div>
            <p className="text-sm text-muted-foreground">Featured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{offers?.filter(o => o.scope === 'gym').length || 0}</div>
            <p className="text-sm text-muted-foreground">Gym-Specific</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{offers?.filter(o => o.status === 'archived').length || 0}</div>
            <p className="text-sm text-muted-foreground">Archived</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v as 'active' | 'archived' | 'disabled')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scopeFilter || "all"} onValueChange={(v) => setScopeFilter(v === "all" ? undefined : v as 'global' | 'gym')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="gym">Gym-Specific</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Offer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredOffers && filteredOffers.length > 0 ? (
              filteredOffers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {offer.featured && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                      <div>
                        <p className="font-medium">{offer.title}</p>
                        <p className="text-sm text-muted-foreground">{offer.brand_name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{offer.offer_type}</Badge>
                  </TableCell>
                  <TableCell>{offer.category?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={offer.scope === 'global' ? 'default' : 'secondary'}>
                      {offer.scope}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={offer.status === 'active' ? 'default' : 'secondary'}>
                      {offer.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {offer.expires_at ? format(new Date(offer.expires_at), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingOffer(offer)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleFeatured(offer)}>
                          {offer.featured ? (
                            <><StarOff className="h-4 w-4 mr-2" />Remove Featured</>
                          ) : (
                            <><Star className="h-4 w-4 mr-2" />Set Featured</>
                          )}
                        </DropdownMenuItem>
                        {offer.status === 'active' ? (
                          <DropdownMenuItem onClick={() => handleArchive(offer)}>
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleRestore(offer)}>
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Restore
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleDelete(offer)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No offers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      
      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingOffer} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingOffer(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingOffer ? 'Edit Offer' : 'Create Offer'}</DialogTitle>
          </DialogHeader>
          <AdminOfferForm 
            offer={editingOffer} 
            onSuccess={() => {
              setShowCreateDialog(false);
              setEditingOffer(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
