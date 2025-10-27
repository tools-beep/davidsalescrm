import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Eye, Download, Edit, Trash2, UserCog, Mail, Key } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface EODSubmission {
  id: string;
  user_id: string;
  submitted_at: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  total_hours: number;
  summary: string | null;
  email_sent: boolean;
  full_name: string | null;
  email: string;
}

export default function EODDashboard() {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<EODSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [selectedSubmission, setSelectedSubmission] = useState<EODSubmission | null>(null);
  const [images, setImages] = useState<Array<{ id: string; url: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{id: string; email: string; full_name: string}>>([]);

  useEffect(() => {
    loadReports();
    loadUsers();
  }, [date]);

  const loadUsers = async () => {
    try {
      // Try using RPC to get auth users (more reliable)
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_all_users_for_eod');
      
      if (!rpcError && rpcData && rpcData.length > 0) {
        console.log('Loaded users via RPC:', rpcData.length);
        const mapped = rpcData.map((u: any) => ({
          id: u.id,
          email: u.email || 'unknown@email.com',
          full_name: u.full_name || u.email || 'Unknown User'
        }));
        setAllUsers(mapped);
        return;
      }
      
      // Fallback: Try user_profiles
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name')
        .order('email');
      
      if (error) {
        console.error('Error loading users from profiles:', error);
        // Last fallback: hardcode some users for testing
        console.warn('Using fallback: Check that user_profiles table exists and has data');
        setAllUsers([]);
        return;
      }
      
      if (!data || data.length === 0) {
        console.warn('No user profiles found. Creating test users from submissions...');
        // Try to get users from submissions
        const { data: subData } = await supabase
          .from('eod_submissions')
          .select('user_id')
          .order('submitted_at', { ascending: false })
          .limit(50);
        
        if (subData && subData.length > 0) {
          const uniqueUserIds = [...new Set(subData.map((s: any) => s.user_id))];
          console.log('Found users from submissions:', uniqueUserIds.length);
          setAllUsers(uniqueUserIds.map((id, idx) => ({
            id: id,
            email: `user${idx + 1}@email.com`,
            full_name: `User ${idx + 1}`
          })));
        } else {
          setAllUsers([]);
        }
        return;
      }
      
      // Map and create full_name
      const mapped = (data || []).map((u: any) => ({
        id: u.user_id,
        email: u.email || 'unknown@email.com',
        full_name: u.first_name && u.last_name 
          ? `${u.first_name} ${u.last_name}` 
          : u.first_name || u.last_name || u.email || 'Unknown User'
      }));
      
      console.log('Loaded users from profiles:', mapped.length);
      setAllUsers(mapped);
    } catch (e) {
      console.error('Failed to load users:', e);
      setAllUsers([]);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Get submissions for the selected date
      const { data, error } = await supabase
        .from('eod_submissions')
        .select('*')
        .gte('submitted_at', `${dateStr}T00:00:00`)
        .lte('submitted_at', `${dateStr}T23:59:59`)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error loading submissions:', error);
        setSubmissions([]);
        return;
      }

      // Get user info for each submission
      const userIds = [...new Set((data || []).map((s: any) => s.user_id))];
      const { data: users } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', userIds);

      const userMap = new Map();
      (users || []).forEach((u: any) => {
        userMap.set(u.user_id, {
          email: u.email,
          full_name: u.first_name && u.last_name 
            ? `${u.first_name} ${u.last_name}` 
            : u.first_name || u.last_name || u.email || 'Unknown'
        });
      });

      const mapped = (data || []).map((r: any) => {
        const userInfo = userMap.get(r.user_id) || { email: 'Unknown', full_name: 'Unknown' };
        return {
          id: r.id,
          user_id: r.user_id,
          submitted_at: r.submitted_at,
          clocked_in_at: r.clocked_in_at,
          clocked_out_at: r.clocked_out_at,
          total_hours: r.total_hours,
          summary: r.summary,
          email_sent: r.email_sent,
          full_name: userInfo.full_name,
          email: userInfo.email,
        };
      });
      setSubmissions(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const [submissionTasks, setSubmissionTasks] = useState<Array<any>>([]);

  const viewSubmission = async (submission: EODSubmission) => {
    setSelectedSubmission(submission);
    
    // Load images from submission
    const { data: imgs } = await supabase
      .from('eod_submission_images')
      .select('*')
      .eq('submission_id', submission.id);
    setImages((imgs || []).map(i => ({ id: i.id, url: i.image_url || '' })));

    // Load tasks from submission
    const { data: tasks } = await supabase
      .from('eod_submission_tasks')
      .select('*')
      .eq('submission_id', submission.id);
    setSubmissionTasks(tasks || []);
  };

  const calculateHours = (start: string | null, end: string | null) => {
    if (!start || !end) return 'N/A';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Get list of users who haven't submitted
  const usersWithoutSubmission = allUsers.filter(
    user => !submissions.some(sub => sub.user_id === user.id)
  );

  const exportToExcel = () => {
    try {
      const exportData = submissions.map(sub => ({
        'Team Member': sub.full_name || 'Unknown',
        'Email': sub.email,
        'Date': format(new Date(sub.submitted_at), 'MMM dd, yyyy'),
        'Clock In': sub.clocked_in_at ? format(new Date(sub.clocked_in_at), 'h:mm a') : '-',
        'Clock Out': sub.clocked_out_at ? format(new Date(sub.clocked_out_at), 'h:mm a') : '-',
        'Total Hours': `${sub.total_hours}h`,
        'Email Sent': sub.email_sent ? 'Yes' : 'No',
        'Status': 'Submitted',
        'Summary': sub.summary || 'No summary provided',
      }));

      // Add users who haven't submitted
      usersWithoutSubmission.forEach(user => {
        exportData.push({
          'Team Member': user.full_name || 'Unknown',
          'Email': user.email,
          'Date': format(date, 'MMM dd, yyyy'),
          'Clock In': '-',
          'Clock Out': '-',
          'Total Hours': '-',
          'Email Sent': 'No',
          'Status': 'NOT SUBMITTED',
          'Summary': 'No EOD submitted',
        });
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'EOD Reports');

      // Auto-size columns
      const maxWidth = exportData.reduce((acc, row) => {
        Object.keys(row).forEach(key => {
          const value = String(row[key as keyof typeof row]);
          acc[key] = Math.max(acc[key] || 10, value.length);
        });
        return acc;
      }, {} as Record<string, number>);

      ws['!cols'] = Object.keys(maxWidth).map(key => ({ wch: Math.min(maxWidth[key] + 2, 50) }));

      const fileName = `EOD_Reports_${format(date, 'yyyy-MM-dd')}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast({ title: 'Export successful', description: `Downloaded ${fileName}` });
    } catch (error: any) {
      toast({ title: 'Export failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team EOD Reports</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToExcel} disabled={submissions.length === 0 && usersWithoutSubmission.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export to Excel
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : (
            <>
              {submissions.length === 0 && usersWithoutSubmission.length === 0 ? (
                <p className="text-center text-muted-foreground">No users found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Member</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Submitted EODs */}
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{submission.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{submission.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.clocked_in_at ? format(new Date(submission.clocked_in_at), 'h:mm a') : '-'}
                        </TableCell>
                        <TableCell>
                          {submission.clocked_out_at ? format(new Date(submission.clocked_out_at), 'h:mm a') : '-'}
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{submission.total_hours}h</TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            ✓ Submitted
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => viewSubmission(submission)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {/* Users who haven't submitted */}
                    {usersWithoutSubmission.map((user) => (
                      <TableRow key={user.id} className="bg-red-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            ✗ Not Submitted
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSubmission?.full_name}'s EOD - {selectedSubmission?.submitted_at && format(new Date(selectedSubmission.submitted_at), 'MMM dd, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Work Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Work Hours</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Clock In</p>
                  <p className="font-medium">
                    {selectedSubmission?.clocked_in_at 
                      ? format(new Date(selectedSubmission.clocked_in_at), 'h:mm a')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clock Out</p>
                  <p className="font-medium">
                    {selectedSubmission?.clocked_out_at
                      ? format(new Date(selectedSubmission.clocked_out_at), 'h:mm a')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="font-bold text-primary text-lg">{selectedSubmission?.total_hours}h</p>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            {submissionTasks.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Tasks Completed ({submissionTasks.length})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissionTasks.map((task: any) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.client_name}</TableCell>
                          <TableCell>{task.task_description}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {task.comments || '-'}
                          </TableCell>
                          <TableCell>
                            {Math.floor(task.duration_minutes / 60)}h {task.duration_minutes % 60}m
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} className="font-bold text-right">Total:</TableCell>
                        <TableCell className="font-bold">
                          {(() => {
                            const total = submissionTasks.reduce((sum: number, t: any) => sum + (t.duration_minutes || 0), 0);
                            return `${Math.floor(total / 60)}h ${total % 60}m`;
                          })()}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            {/* Summary */}
            <div>
              <h4 className="font-semibold mb-2">Summary</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {selectedSubmission?.summary || 'No summary provided'}
              </p>
            </div>
            
            {/* Images */}
            {images.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Screenshots ({images.length})</h4>
                <div className="grid grid-cols-2 gap-4">
                  {images.map(img => (
                    <img key={img.id} src={img.url} alt="eod screenshot" className="rounded border w-full" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

