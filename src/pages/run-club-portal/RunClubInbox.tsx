import { useOutletContext } from "react-router-dom";
import { RunClub } from "@/hooks/useRunClubs";

interface RunClubPortalContext {
  selectedClubId: string | null;
  selectedClub: RunClub | null;
}

export default function RunClubInbox() {
  const { selectedClubId, selectedClub } = useOutletContext<RunClubPortalContext>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Inbox</h2>
        <p className="text-muted-foreground">
          Messages from members and applicants
        </p>
      </div>

      <div className="text-center py-12 bg-card border border-border rounded-lg">
        <p className="text-muted-foreground">
          Messaging integration for run clubs coming soon.
          For now, applicant conversations are created automatically and can be viewed in the main Inbox.
        </p>
      </div>
    </div>
  );
}
