"use client";

import { MessageSquare } from "lucide-react";
import { BackHeader } from "@/components/ui/page-header";
import { ListContainer, ListRow } from "@/components/ui/list";

export function ProfileHelpView() {
  return (
    <div className="space-y-6">
      <BackHeader href="/profile" backLabel="Back to Profile" title="Help & Support" />

      <ListContainer>
        <ListRow
          href="/feedback"
          icon={MessageSquare}
          label="Send Feedback"
          description="Report a bug or request a feature"
        />
        <ListRow
          href="/my-feedback"
          icon={MessageSquare}
          label="My Feedback"
          description="View your submitted feedback"
        />
      </ListContainer>
    </div>
  );
}
