import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { CRMPipeline } from "@/components/crm/CRMPipeline";
import { CRMLeadsList } from "@/components/crm/CRMLeadsList";
import { CRMLeadDetail } from "@/components/crm/CRMLeadDetail";
import { CRMSettings } from "@/components/crm/CRMSettings";
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { usePipelineStages, useCRMLeads, CRMLead } from "@/hooks/useCRM";
import { LayoutDashboard, Kanban, List, Settings } from "lucide-react";

interface GymPortalContext {
  selectedGymId: string | null;
  selectedGym: { id: string; name: string } | undefined;
}

export default function GymCRM() {
  const { selectedGymId } = useOutletContext<GymPortalContext>();
  const [activeTab, setActiveTab] = useState("pipeline");
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);

  const { stages, isLoading: stagesLoading } = usePipelineStages('gym', selectedGymId || '');
  const { 
    leads, 
    isLoading: leadsLoading,
    moveToStage,
    assignLead,
    convertLead,
    updateLead,
    createLead,
    refetch 
  } = useCRMLeads('gym', selectedGymId || '');

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym first.</p>
      </div>
    );
  }

  const handleLeadClick = (lead: CRMLead) => {
    setSelectedLead(lead);
  };

  const handleMoveToStage = async (leadId: string, stageId: string) => {
    await moveToStage(leadId, stageId);
  };

  const handleAssign = async (leadId: string, userId: string | null) => {
    await assignLead(leadId, userId);
  };

  const handleConvert = async (leadId: string, status: 'won' | 'lost') => {
    await convertLead(leadId, status);
  };

  const handleUpdateLead = async (leadId: string, updates: Partial<CRMLead>) => {
    await updateLead(leadId, updates);
  };

  const isLoading = stagesLoading || leadsLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Manage leads, enquiries, and conversions</p>
        </div>
        <CreateLeadDialog 
          stages={stages}
          onCreateLead={createLead}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-2">
            <Kanban className="h-4 w-4" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <List className="h-4 w-4" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <CRMDashboard contextType="gym" contextId={selectedGymId} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CRMPipeline
              contextType="gym"
              contextId={selectedGymId}
              stages={stages}
              leads={leads}
              onLeadClick={handleLeadClick}
              onMoveToStage={handleMoveToStage}
            />
          )}
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <CRMLeadsList
              leads={leads}
              stages={stages}
              onLeadClick={handleLeadClick}
              onAssign={handleAssign}
              onMoveToStage={handleMoveToStage}
              onConvert={handleConvert}
            />
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <CRMSettings contextType="gym" contextId={selectedGymId} />
        </TabsContent>
      </Tabs>

      <CRMLeadDetail
        lead={selectedLead}
        stages={stages}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdate={handleUpdateLead}
        onMoveToStage={handleMoveToStage}
        onConvert={handleConvert}
        contextType="gym"
        contextId={selectedGymId}
      />
    </div>
  );
}
