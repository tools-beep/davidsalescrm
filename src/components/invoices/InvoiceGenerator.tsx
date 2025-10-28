import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Send, Calendar, DollarSign, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Client {
  client_name: string;
  client_email: string;
}

interface InvoiceItem {
  task_date: string;
  task_description: string;
  hours: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  total_amount: number;
  status: string;
  created_at: string;
  approved_at?: string;
}

export function InvoiceGenerator() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState<string>("50.00");
  const [notes, setNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [previewItems, setPreviewItems] = useState<InvoiceItem[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);

  useEffect(() => {
    loadClients();
    loadInvoices();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadInvoicePreview();
    }
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: assignments } = await supabase
        .from("user_client_assignments")
        .select("client_name, client_email")
        .eq("user_id", user.id);

      if (assignments) {
        setClients(assignments);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading invoices:", error);
        return;
      }

      setInvoices(data || []);
    } catch (error) {
      console.error("Error loading invoices:", error);
    }
  };

  const loadInvoicePreview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate date range (last 2 weeks)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      // Fetch clock-in records for the selected client in the last 2 weeks
      const { data: clockIns, error: clockError } = await supabase
        .from("eod_clock_ins")
        .select("*")
        .eq("user_id", user.id)
        .eq("client_name", selectedClient)
        .gte("clocked_in_at", startDate.toISOString())
        .lte("clocked_in_at", endDate.toISOString())
        .not("clocked_out_at", "is", null)
        .order("clocked_in_at", { ascending: true });

      if (clockError) {
        console.error("Error loading clock-in records:", clockError);
        return;
      }

      // Fetch time entries for task descriptions
      const { data: entries, error: entriesError } = await supabase
        .from("eod_time_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("client_name", selectedClient)
        .gte("started_at", startDate.toISOString())
        .lte("started_at", endDate.toISOString())
        .not("ended_at", "is", null)
        .order("started_at", { ascending: true });

      if (entriesError) {
        console.error("Error loading time entries:", entriesError);
        return;
      }

      // Calculate total hours from clock-in/clock-out times
      let totalHoursFromClockIns = 0;
      const clockInsByDate: { [key: string]: { hours: number; clockedIn: string; clockedOut: string } } = {};

      (clockIns || []).forEach((clockIn: any) => {
        const clockedInTime = new Date(clockIn.clocked_in_at);
        const clockedOutTime = new Date(clockIn.clocked_out_at);
        const hours = (clockedOutTime.getTime() - clockedInTime.getTime()) / (1000 * 60 * 60);
        
        const dateKey = clockIn.clocked_in_at.split("T")[0];
        clockInsByDate[dateKey] = {
          hours: parseFloat(hours.toFixed(2)),
          clockedIn: clockedInTime.toLocaleTimeString(),
          clockedOut: clockedOutTime.toLocaleTimeString(),
        };
        
        totalHoursFromClockIns += hours;
      });

      // Group tasks by date for display
      const tasksByDate: { [key: string]: string[] } = {};
      (entries || []).forEach((entry: any) => {
        const dateKey = entry.started_at.split("T")[0];
        if (!tasksByDate[dateKey]) {
          tasksByDate[dateKey] = [];
        }
        tasksByDate[dateKey].push(entry.task_description);
      });

      // Create invoice items based on clock-in records
      const items: InvoiceItem[] = [];
      const rate = parseFloat(hourlyRate);

      Object.keys(clockInsByDate).sort().forEach((date) => {
        const clockData = clockInsByDate[date];
        const tasks = tasksByDate[date] || [];
        const taskDescription = tasks.length > 0 
          ? `${tasks.join(", ")} (${clockData.clockedIn} - ${clockData.clockedOut})`
          : `Work performed (${clockData.clockedIn} - ${clockData.clockedOut})`;

        items.push({
          task_date: date,
          task_description: taskDescription,
          hours: clockData.hours,
          rate,
          amount: parseFloat((clockData.hours * rate).toFixed(2)),
        });
      });

      setPreviewItems(items);
      setTotalHours(parseFloat(totalHoursFromClockIns.toFixed(2)));
    } catch (error) {
      console.error("Error loading invoice preview:", error);
    }
  };

  const handleClientSelect = (clientName: string) => {
    setSelectedClient(clientName);
    const client = clients.find((c) => c.client_name === clientName);
    if (client) {
      setClientEmail(client.client_email);
    }
  };

  const generateInvoice = async () => {
    if (!selectedClient || !clientEmail) {
      toast.error("Please select a client");
      return;
    }

    if (previewItems.length === 0) {
      toast.error("No work entries found for the last 2 weeks");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 14);

      // Generate invoice number
      const { data: invoiceNumberData, error: invoiceNumberError } = await supabase.rpc(
        "generate_invoice_number"
      );

      if (invoiceNumberError) throw invoiceNumberError;

      const invoiceNumber = invoiceNumberData;
      const totalAmount = previewItems.reduce((sum, item) => sum + item.amount, 0);

      // Create invoice
      const { data: invoice, error: invoiceError } = await (supabase as any)
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          user_id: user.id,
          client_name: selectedClient,
          client_email: clientEmail,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          total_hours: totalHours,
          total_amount: parseFloat(totalAmount.toFixed(2)),
          currency: "USD",
          status: "pending",
          notes: notes || "Thank you for your business!",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      const invoiceItems = previewItems.map((item) => ({
        invoice_id: invoice.id,
        task_date: item.task_date,
        task_description: item.task_description,
        hours: item.hours,
        rate: item.rate,
        amount: item.amount,
      }));

      const { error: itemsError } = await (supabase as any)
        .from("invoice_items")
        .insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Send invoice email
      const { data: emailData, error: emailError } = await supabase.functions.invoke("send-invoice-email", {
        body: {
          invoice_id: invoice.id,
          user_id: user.id,
          client_name: selectedClient,
          client_email: clientEmail,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        },
      });

      if (emailError) {
        console.error("Email error:", emailError);
        
        // Check if it's a function not deployed error
        if (emailError.message?.includes("FunctionsRelayError") || emailError.message?.includes("Failed to fetch")) {
          toast.error("Invoice created, but email function is not deployed. Please run: supabase functions deploy send-invoice-email", {
            duration: 10000,
          });
        } else {
          toast.warning("Invoice created but email failed to send. Please contact support.");
        }
      } else {
        console.log("Email sent successfully:", emailData);
        toast.success("Invoice sent successfully to client and miguel@migueldiaz.ca!");
      }

      // Reset form
      setSelectedClient("");
      setClientEmail("");
      setNotes("");
      setPreviewItems([]);
      setTotalHours(0);

      // Reload invoices
      loadInvoices();
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      toast.error(error.message || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Invoice Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select value={selectedClient} onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.client_name} value={client.client_name}>
                      {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Client Email</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hourly Rate (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => {
                  setHourlyRate(e.target.value);
                  if (selectedClient) loadInvoicePreview();
                }}
                className="pl-10"
                placeholder="50.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes for the invoice..."
              rows={3}
            />
          </div>

          {/* Preview */}
          {previewItems.length > 0 && (
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Invoice Preview (Last 2 Weeks)
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewItems.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm border-b pb-2">
                    <div className="flex-1">
                      <div className="font-medium">{item.task_description}</div>
                      <div className="text-muted-foreground text-xs">
                        {new Date(item.task_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{item.hours.toFixed(2)} hrs</div>
                      <div className="text-muted-foreground text-xs">
                        ${item.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg">
                <span>Total:</span>
                <div className="text-right">
                  <div>{totalHours.toFixed(2)} hours</div>
                  <div className="text-primary">
                    ${(totalHours * parseFloat(hourlyRate)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={generateInvoice}
            disabled={loading || !selectedClient || previewItems.length === 0}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending Invoice...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invoice
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.client_name} • {new Date(invoice.start_date).toLocaleDateString()} - {new Date(invoice.end_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      ${invoice.total_amount.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.total_hours.toFixed(2)} hrs
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

