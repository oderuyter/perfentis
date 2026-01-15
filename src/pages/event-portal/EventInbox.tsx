import { useOutletContext } from "react-router-dom";
import { PortalInbox } from "@/components/messaging/PortalInbox";

interface EventPortalContext {
  selectedEventId: string | null;
  selectedEvent: { id: string; title: string } | undefined;
}

export default function EventInbox() {
  const { selectedEventId } = useOutletContext<EventPortalContext>();

  if (!selectedEventId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an event first</p>
      </div>
    );
  }

  return <PortalInbox contextType="event" contextId={selectedEventId} />;
}
