import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ExcelJS from "exceljs";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  stages: string[];
  stage_order?: any;
  is_active: boolean;
}

interface StageMapping {
  stage: string;
  pipelineId: string;
  pipelineName: string;
}

export function BulkUploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stageMap, setStageMap] = useState<Map<string, StageMapping>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPipelinesAndBuildStageMap();
    }
  }, [open]);

  /**
   * Fetch all active pipelines and build a comprehensive stage-to-pipeline mapping
   * This allows automatic pipeline assignment based on the deal's stage
   */
  const fetchPipelinesAndBuildStageMap = async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      if (data) {
        setPipelines(data);
        
        // Build stage-to-pipeline mapping
        const mapping = new Map<string, StageMapping>();
        
        data.forEach(pipeline => {
          let stages: string[] = [];
          
          // Parse stages from different formats
          if (Array.isArray(pipeline.stages)) {
            if (typeof pipeline.stages[0] === 'string') {
              stages = pipeline.stages;
            } else if (pipeline.stages[0]?.name) {
              stages = pipeline.stages.map((s: any) => String(s.name));
            }
          }
          
          // Map each stage (in various forms) to this pipeline
          stages.forEach(stage => {
            const normalized = normalizeStage(stage);
            if (normalized && !mapping.has(normalized)) {
              mapping.set(normalized, {
                stage: normalized,
                pipelineId: pipeline.id,
                pipelineName: pipeline.name
              });
            }
          });
        });
        
        setStageMap(mapping);
        console.log('[BulkImport] Built stage mapping for', mapping.size, 'stages across', data.length, 'pipelines');
      }
    } catch (error: any) {
      console.error('Error fetching pipelines:', error);
      toast({
        title: "Error loading pipelines",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  /**
   * Comprehensive stage normalization that matches database enum values EXACTLY
   */
  const normalizeStage = (raw?: string): string | null => {
    if (!raw) return null;
    
    let s = raw.toLowerCase().trim();
    
    // Normalize spacing around slashes/dashes
    s = s.replace(/\s*[\/\-]\s*/g, ' / ').replace(/\s+/g, ' ').trim();
    
    // Exact mapping to database enum values
    const stageMapping: Record<string, string> = {
      // Base stages
      'not contacted': 'not contacted',
      'no answer / gatekeeper': 'no answer / gatekeeper',
      'no answer/gatekeeper': 'no answer / gatekeeper',
      'gatekeeper': 'no answer / gatekeeper',
      'decision maker': 'decision maker',
      'dm': 'dm connected',
      'dm connected': 'dm connected',
      'nurturing': 'nurturing',
      'interested': 'interested',
      'strategy call booked': 'strategy call booked',
      'strategy call attended': 'strategy call attended',
      'proposal / scope': 'proposal / scope',
      'proposal': 'proposal / scope',
      'scope': 'proposal / scope',
      'closed won': 'closed won',
      'won': 'closed won',
      'closed lost': 'closed lost',
      'lost': 'closed lost',
      
      // Extended stages
      'uncontacted': 'uncontacted',
      'new opt in': 'uncontacted',
      'new opt / in': 'uncontacted',
      'discovery': 'discovery',
      'not qualified': 'not qualified',
      'not qualified / disqualified': 'not qualified',
      'disqualified': 'not qualified',
      'not interested': 'not interested',
      'do not call': 'not interested',
      'dnc': 'not interested',
      
      // BizOps stages
      'bizops audit agreement sent': 'bizops audit agreement sent',
      'bizops audit paid / booked': 'bizops audit paid / booked',
      'bizops audit booked': 'bizops audit paid / booked',
      'bizops audit attended': 'bizops audit attended',
      'ms agreement sent': 'ms agreement sent',
      'balance paid / deal won': 'balance paid / deal won',
      'deal won (balance paid)': 'balance paid / deal won',
      'balance paid': 'balance paid / deal won',
      
      // Onboarding stages
      'onboarding call booked': 'onboarding call booked',
      'onboarding call attended': 'onboarding call attended',
      
      // Client stages
      'active client (operator)': 'active client (operator)',
      'active client - project in progress': 'active client - project in progress',
      'paused client': 'paused client',
      'candidate replacement': 'candidate replacement',
      'project rescope / expansion': 'project rescope / expansion',
      'active client - project maintenance': 'active client - project maintenance',
      'cancelled / completed': 'cancelled / completed',
    };
    
    return stageMapping[s] || null;
  };

  /**
   * Smart pipeline assignment based on stage
   * Returns the pipeline ID that contains the given stage
   */
  const findPipelineForStage = (stage: string): string | null => {
    const mapping = stageMap.get(stage);
    if (mapping) {
      console.log('[BulkImport] ✓ Stage auto-mapped:', {
        stage,
        pipeline: mapping.pipelineName,
        pipelineId: mapping.pipelineId
      });
      return mapping.pipelineId;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel file (.xls or .xlsx)",
          variant: "destructive",
        });
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }

      setFile(selectedFile);
      setResults(null);
    }
  };

  /**
   * Clean and parse numeric values (revenue, phone numbers)
   * Returns null if the value is invalid or empty
   */
  const parseNumber = (raw: any): number | null => {
    if (raw === null || raw === undefined || raw === '') return null;
    
    const cleaned = String(raw).replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (isNaN(parsed) || parsed === 0) return null;
    return parsed;
  };

  /**
   * Format phone numbers with proper international format
   * Returns null if invalid
   */
  const formatPhoneNumber = (raw: any): string | null => {
    if (!raw) return null;
    
    const digits = String(raw).replace(/[^\d+]/g, '');
    if (!digits) return null;
    
    if (digits.startsWith('+')) return digits;
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    
    return digits ? `+${digits}` : null;
  };

  /**
   * Clean and validate string values
   * Returns null if empty or whitespace-only
   */
  const cleanString = (raw: any): string | null => {
    if (raw === null || raw === undefined) return null;
    
    const cleaned = String(raw).trim();
    return cleaned.length > 0 ? cleaned : null;
  };

  const handleUpload = async () => {
    if (!file) return;

    if (pipelines.length === 0) {
      toast({
        title: "No pipelines available",
        description: "Please create at least one pipeline before importing",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(10);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error('You must be signed in to import');

      setProgress(20);
      
      // Load Excel file
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      // Find best worksheet by scoring headers
      const sheetScore = (ws: any) => {
        let score = 0;
        const maxRows = Math.min(10, ws.rowCount);
        for (let r = 1; r <= maxRows; r++) {
          const row = ws.getRow(r);
          row.eachCell((cell: any) => {
            const text = String(cell?.text || cell?.value || '').toLowerCase();
            if (text.includes('company')) score++;
            if (text.includes('deal')) score++;
            if (text.includes('contact')) score++;
            if (text.includes('email')) score++;
            if (text.includes('phone')) score++;
            if (text.includes('stage')) score++;
          });
        }
        return score;
      };
      
      const ws = workbook.worksheets.reduce(
        (best: any, current: any) => sheetScore(current) > sheetScore(best) ? current : best,
        workbook.worksheets[0]
      );

      setProgress(30);

      // Find header row
      let headerRowIdx = 1;
      let bestScore = -1;
      for (let r = 1; r <= Math.min(10, ws.rowCount); r++) {
        const row = ws.getRow(r);
        let score = 0;
        row.eachCell((cell: any) => {
          const text = String(cell?.text || cell?.value || '').toLowerCase();
          if (text.includes('company') || text.includes('deal') || 
              text.includes('contact') || text.includes('name') ||
              text.includes('email') || text.includes('phone')) score++;
        });
        if (score > bestScore) {
          bestScore = score;
          headerRowIdx = r;
        }
      }

      const headerRow = ws.getRow(headerRowIdx);
      const headers: string[] = [];
      headerRow.eachCell((cell: any, colNumber: number) => {
        headers[colNumber] = String(cell?.text || cell?.value || '').trim().toLowerCase();
      });

      console.log('[BulkImport] Found headers at row', headerRowIdx, ':', headers.filter(Boolean));

      setProgress(40);

      // Pre-load existing records to avoid duplicates
      const { data: existingCompanies } = await supabase
        .from('companies')
        .select('id, name');
      const companyMap = new Map<string, string>(
        (existingCompanies || []).map((c: any) => [c.name.toLowerCase(), c.id])
      );

      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('id, primary_email, first_name, last_name, primary_phone');
      const contactMap = new Map<string, string>();
      (existingContacts || []).forEach((c: any) => {
        const key = c.primary_email || `${c.first_name}_${c.last_name}_${c.primary_phone}`;
        contactMap.set(key.toLowerCase(), c.id);
      });

      setProgress(50);

      // Process rows
      const newCompanies: any[] = [];
      const newContacts: any[] = [];
      const newDeals: any[] = [];
      const skippedRows: any[] = [];
      const stageWarnings: Set<string> = new Set();

      const getCell = (row: any, idx: number) => String(row.getCell(idx)?.text ?? row.getCell(idx)?.value ?? '').trim();

      for (let rowIdx = headerRowIdx + 1; rowIdx <= ws.rowCount; rowIdx++) {
        const row = ws.getRow(rowIdx);
        const rowData: any = {};

        // Extract all cell values
        headers.forEach((header, colIdx) => {
          if (!header) return;
          const value = getCell(row, colIdx);
          if (value) rowData[header] = value;
        });

        // Skip completely empty rows
        if (Object.keys(rowData).length === 0) continue;

        // Extract and clean company data
        const companyName = cleanString(
          rowData['company name'] || rowData['company']
        );
        const companyPhone = formatPhoneNumber(
          rowData['company phone number'] || rowData['company phone']
        );
        const companyEmail = cleanString(rowData['company email']);

        // Extract and clean contact data
        const firstName = cleanString(
          rowData['contact first name'] || rowData['first name'] || rowData['firstname']
        );
        const lastName = cleanString(
          rowData['contact last name'] || rowData['last name'] || rowData['lastname']
        );
        const primaryEmail = cleanString(
          rowData['contact email'] || rowData['email']
        );
        const secondaryEmail = cleanString(
          rowData['contact secondary email'] || rowData['secondary email']
        );
        const primaryPhone = formatPhoneNumber(
          rowData['contact phone number'] || rowData['contact phone'] || rowData['phone']
        );
        const secondaryPhone = formatPhoneNumber(
          rowData['contact secondary phone number'] || rowData['secondary phone']
        );
        const website = cleanString(
          rowData['contact website'] || rowData['website']
        );
        const linkedin = cleanString(
          rowData['contact linkedin'] || rowData['linkedin']
        );
        const instagram = cleanString(
          rowData['contact instagram'] || rowData['instagram'] || rowData['contacted instagram']
        );
        const tiktok = cleanString(
          rowData['contact tiktok'] || rowData['tiktok']
        );
        const facebook = cleanString(
          rowData['contact facebook'] || rowData['facebook']
        );

        // Extract and clean deal data
        const dealName = cleanString(
          rowData['deal name'] || rowData['name']
        );
        const dealStageRaw = cleanString(
          rowData['deal stage'] || rowData['stage'] || rowData['sales stage']
        );
        const revenue = parseNumber(rowData['revenue'] || rowData['amount'] || rowData['deal amount']);
        const dealSource = cleanString(rowData['deal source'] || rowData['source'] || rowData['lead source']);
        const priorityRaw = cleanString(rowData['priority']);
        const vertical = cleanString(rowData['vertical']);
        const dealNotes = cleanString(rowData['deal notes'] || rowData['notes']);

        // Parse priority
        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (priorityRaw) {
          const p = priorityRaw.toLowerCase();
          if (p.includes('high')) priority = 'high';
          else if (p.includes('low')) priority = 'low';
        }

        // Normalize and map stage to pipeline
        const normalizedStage = dealStageRaw ? normalizeStage(dealStageRaw) : null;
        let assignedPipelineId: string | null = null;
        let finalStage: string = 'not contacted'; // Safe default

        if (normalizedStage) {
          assignedPipelineId = findPipelineForStage(normalizedStage);
          if (assignedPipelineId) {
            finalStage = normalizedStage;
          } else {
            // Stage not found in any pipeline
            stageWarnings.add(`"${dealStageRaw}" → not found in any pipeline`);
            // Use first pipeline's first stage as fallback
            if (pipelines.length > 0) {
              assignedPipelineId = pipelines[0].id;
              const firstStages = pipelines[0].stages;
              if (firstStages && firstStages.length > 0) {
                const firstStage = normalizeStage(firstStages[0]);
                if (firstStage) finalStage = firstStage;
              }
            }
          }
        } else {
          // No stage provided, use first pipeline
          if (pipelines.length > 0) {
            assignedPipelineId = pipelines[0].id;
          }
        }

        // Skip row if no essential data
        if (!dealName && !companyName && !firstName && !lastName && !primaryEmail) {
          skippedRows.push({ row: rowIdx, reason: 'No essential data (deal name, company, or contact)' });
          continue;
        }

        // Handle company
        let companyId: string | null = null;
        if (companyName) {
          const existingId = companyMap.get(companyName.toLowerCase());
          if (existingId) {
            companyId = existingId;
          } else {
            const tempId = `temp_company_${newCompanies.length}`;
            newCompanies.push({
              name: companyName,
              company_phone: companyPhone,
              email: companyEmail,
              tempId
            });
            companyMap.set(companyName.toLowerCase(), tempId);
            companyId = tempId;
          }
        }

        // Handle contact
        let contactId: string | null = null;
        if (firstName || lastName || primaryEmail || primaryPhone) {
          const contactKey = primaryEmail || `${firstName}_${lastName}_${primaryPhone}`;
          const existingId = contactMap.get(contactKey.toLowerCase());
          if (existingId) {
            contactId = existingId;
          } else {
            const tempId = `temp_contact_${newContacts.length}`;
            newContacts.push({
              company_id: companyId,
              first_name: firstName || '',
              last_name: lastName || '',
              primary_email: primaryEmail,
              secondary_email: secondaryEmail,
              primary_phone: primaryPhone,
              secondary_phone: secondaryPhone,
              website_url: website,
              linkedin_url: linkedin,
              instagram_url: instagram,
              tiktok_url: tiktok,
              facebook_url: facebook,
              tempId,
              key: contactKey
            });
            contactMap.set(contactKey.toLowerCase(), tempId);
            contactId = tempId;
          }
        }

        // Handle deal
        if (dealName && assignedPipelineId) {
          newDeals.push({
            name: dealName,
            company_id: companyId,
            primary_contact_id: contactId,
            pipeline_id: assignedPipelineId,
            stage: finalStage,
            priority,
            amount: revenue,
            source: dealSource,
            vertical,
            notes: dealNotes,
            tempCompanyId: companyId,
            tempContactId: contactId,
            currency: 'USD',
            last_activity_date: new Date().toISOString()
          });
        } else if (dealName) {
          skippedRows.push({ row: rowIdx, reason: 'No valid pipeline for deal stage' });
        }
      }

      setProgress(60);

      // Insert companies
      if (newCompanies.length > 0) {
        const toInsert = newCompanies.map(({ tempId, ...c }) => c);
        const { data: inserted, error } = await supabase
          .from('companies')
          .insert(toInsert)
          .select('id, name');
        
        if (error) throw error;
        
        // Update company ID mappings
        if (inserted && inserted.length > 0) {
          inserted.forEach((c: any, idx: number) => {
            const tempId = newCompanies[idx].tempId;
            companyMap.set(c.name.toLowerCase(), c.id);
            
            // Replace temp IDs in contacts and deals
            newContacts.forEach((contact: any) => {
              if (contact.company_id === tempId) contact.company_id = c.id;
            });
            newDeals.forEach((deal: any) => {
              if (deal.company_id === tempId) deal.company_id = c.id;
              if (deal.tempCompanyId === tempId) deal.tempCompanyId = c.id;
            });
          });
        }
      }

      setProgress(70);

      // Insert contacts
      if (newContacts.length > 0) {
        const toInsert = newContacts.map(({ tempId, key, ...c }) => c);
        const { data: inserted, error } = await supabase
          .from('contacts')
          .insert(toInsert)
          .select('id, primary_email, first_name, last_name, primary_phone');
        
        if (error) throw error;
        
        // Update contact ID mappings
        if (inserted && inserted.length > 0) {
          inserted.forEach((c: any, idx: number) => {
            const tempId = newContacts[idx].tempId;
            const key = c.primary_email || `${c.first_name}_${c.last_name}_${c.primary_phone}`;
            contactMap.set(key.toLowerCase(), c.id);
            
            // Replace temp IDs in deals
            newDeals.forEach((deal: any) => {
              if (deal.primary_contact_id === tempId) deal.primary_contact_id = c.id;
              if (deal.tempContactId === tempId) deal.tempContactId = c.id;
            });
          });
        }
      }

      setProgress(80);

      // Insert deals
      if (newDeals.length > 0) {
        const toInsert = newDeals.map(({ tempCompanyId, tempContactId, ...d }) => {
          // Final cleanup: remove any temp IDs that weren't resolved
          return {
            ...d,
            company_id: d.company_id && !d.company_id.startsWith('temp_') ? d.company_id : null,
            primary_contact_id: d.primary_contact_id && !d.primary_contact_id.startsWith('temp_') ? d.primary_contact_id : null,
          };
        });
        
        const { error } = await supabase
          .from('deals')
          .insert(toInsert);
        
        if (error) throw error;
      }

      setProgress(100);

      // Show results
      const results = {
        companiesCreated: newCompanies.length,
        contactsCreated: newContacts.length,
        dealsCreated: newDeals.length,
        rowsSkipped: skippedRows.length,
        skippedRows: skippedRows.slice(0, 10), // Show first 10
        stageWarnings: Array.from(stageWarnings).slice(0, 10)
      };
      
      setResults(results);
      
      toast({
        title: "Import completed!",
        description: `Created ${results.companiesCreated} companies, ${results.contactsCreated} contacts, and ${results.dealsCreated} deals`,
      });
      
      // Reload page after 2 seconds
      setTimeout(() => window.location.reload(), 2000);

    } catch (error: any) {
      console.error('[BulkImport] Error:', error);
      toast({
        title: "Import failed",
        description: error?.message || 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setResults(null);
    setProgress(0);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to automatically create companies, deals, and contacts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Smart Import Features</AlertTitle>
            <AlertDescription className="text-sm space-y-2 mt-2">
              <p>✨ <strong>Auto-Pipeline Assignment:</strong> Deals are automatically assigned to the correct pipeline based on their stage</p>
              <p>🎯 <strong>Accurate Data:</strong> Empty/null values are automatically skipped</p>
              <p>📊 <strong>Number Validation:</strong> Revenue and phone numbers are validated and formatted</p>
              <p>🔗 <strong>Duplicate Prevention:</strong> Existing companies and contacts are automatically linked</p>
            </AlertDescription>
          </Alert>

          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertTitle>Expected Excel Format</AlertTitle>
            <AlertDescription className="text-sm">
              <div className="space-y-2 mt-2">
                <div>
                  <p className="font-semibold text-gray-600">Company columns:</p>
                  <p className="text-xs">Company Name, Company Phone Number, Company Email</p>
                </div>
                <div>
                  <p className="font-semibold text-green-600">Deal columns:</p>
                  <p className="text-xs">Deal Name, Deal Stage, Revenue, Priority, Vertical, Deal Source, Deal Notes</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Contact columns:</p>
                  <p className="text-xs">Contact First Name, Contact Last Name, Contact Email, Contact Secondary Email, Contact Phone Number, Contact Secondary Phone Number, Contact Website, Contact LinkedIn, Contact Instagram, Contact TikTok, Contact Facebook</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Available Pipelines</Label>
            <div className="flex flex-wrap gap-2">
              {pipelines.map(pipeline => (
                <Badge key={pipeline.id} variant="outline">
                  {pipeline.name}
                </Badge>
              ))}
            </div>
            {pipelines.length === 0 && (
              <p className="text-sm text-muted-foreground text-red-500">
                ⚠️ No pipelines found. Please create at least one pipeline before importing.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-upload">Select Excel File</Label>
            <input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              disabled={uploading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                {progress < 30 ? 'Reading Excel file...' :
                 progress < 60 ? 'Processing data...' :
                 progress < 90 ? 'Creating records...' :
                 'Finalizing...'}
              </p>
            </div>
          )}

          {results && (
            <div className="space-y-3">
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle>Import Complete!</AlertTitle>
                <AlertDescription>
                  <div className="space-y-1 mt-2">
                    <p>✓ Companies created: <strong>{results.companiesCreated}</strong></p>
                    <p>✓ Contacts created: <strong>{results.contactsCreated}</strong></p>
                    <p>✓ Deals created: <strong>{results.dealsCreated}</strong></p>
                    {results.rowsSkipped > 0 && (
                      <p className="text-amber-600">⚠ Rows skipped: <strong>{results.rowsSkipped}</strong></p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {results.stageWarnings && results.stageWarnings.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Stage Mapping Warnings</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1 mt-2 text-xs">
                      {results.stageWarnings.map((warning: string, idx: number) => (
                        <p key={idx}>{warning}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {results.skippedRows && results.skippedRows.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Skipped Rows</AlertTitle>
                  <AlertDescription>
                    <div className="space-y-1 mt-2 text-xs">
                      {results.skippedRows.map((skip: any, idx: number) => (
                        <p key={idx}>Row {skip.row}: {skip.reason}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetDialog} disabled={uploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading || pipelines.length === 0}
            >
              {uploading ? "Importing..." : "Upload & Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

