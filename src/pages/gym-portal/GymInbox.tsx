import { useOutletContext } from "react-router-dom";
import { PortalInbox } from "@/components/messaging/PortalInbox";

interface GymPortalContext {
  selectedGymId: string | null;
  selectedGym: { id: string; name: string } | undefined;
}

export default function GymInbox() {
  const { selectedGymId } = useOutletContext<GymPortalContext>();

  if (!selectedGymId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a gym first</p>
      </div>
    );
  }

  return <PortalInbox contextType="gym" contextId={selectedGymId} />;
}
