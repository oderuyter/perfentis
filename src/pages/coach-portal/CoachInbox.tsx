import { useOutletContext } from "react-router-dom";
import { PortalInbox } from "@/components/messaging/PortalInbox";

interface CoachPortalContext {
  coach: { id: string; display_name: string } | null;
}

export default function CoachInbox() {
  const { coach } = useOutletContext<CoachPortalContext>();

  if (!coach) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading coach data...</p>
      </div>
    );
  }

  return <PortalInbox contextType="coach" contextId={coach.id} />;
}
