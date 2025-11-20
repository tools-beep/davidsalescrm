import { useEffect } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface CalSchedulerProps {
  dealId: string;
  contactId?: string;
  companyId?: string;
}

export function CalScheduler({ dealId, contactId, companyId }: CalSchedulerProps) {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "45-strategy-call" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <CardTitle>Schedule Meeting</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div style={{ height: "700px", overflow: "auto" }}>
          <Cal
            namespace="45-strategy-call"
            calLink="stafflyai/45-strategy-call"
            style={{ width: "100%", height: "100%", overflow: "scroll" }}
            config={{ layout: "month_view" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

