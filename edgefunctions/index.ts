import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExcelRow {
  'Company Name'?: string;
  'Deal Name'?: string;
  "Client's Full Name"?: string;
  'Client First Name'?: string;
  'Client Last Name'?: string;
  "Client's Email"?: string;
  'Time Zone'?: string;
  "Client's Phone"?: string;
  'Sales Stage'?: string;
  'Notes'?: string;
}

const CHUNK_SIZE = 50; // Process 50 rows at a time

// Format phone number - handle both string and numeric Excel values
function formatPhoneNumber(phone: any): string | undefined {
  if (!phone) return undefined;
  
  // Convert to string if it's a number
  let phoneStr = typeof phone === 'number' ? phone.toString() : phone.toString();
  
  console.log(`Raw phone value: ${phone} (type: ${typeof phone}), converted: ${phoneStr}`);
  
  // Remove all non-numeric characters
  let cleaned = phoneStr.replace(/[^\d]/g, '');
  
  console.log(`Cleaned phone: ${cleaned}`);
  
  // If empty after cleaning, return undefined
  if (!cleaned || cleaned.length === 0) return undefined;
  
  // Handle 10-digit North American numbers (604, 778 area codes)
  if (cleaned.length === 10) {
    const formatted = '+1' + cleaned;
    console.log(`Formatted 10-digit number: ${formatted}`);
    return formatted;
  }
  
  // Handle 11-digit numbers starting with 1 (US/Canada)
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const formatted = '+' + cleaned;
    console.log(`Formatted 11-digit number: ${formatted}`);
    return formatted;
  }
  
  // For other lengths, add + if not present
  const formatted = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
  console.log(`Formatted other number: ${formatted}`);
  return formatted;
}

// Map Excel sales stage to database enum
function mapSalesStage(excelStage: string | undefined): string {
  if (!excelStage) return 'not contacted';
  
  const stage = excelStage.toLowerCase().trim();
  
  // Map Excel stages to database enum values
  const stageMapping: Record<string, string> = {
    'not contacted': 'not contacted',
    'no answer': 'no answer / gatekeeper',
    'no answer / gatekeeper': 'no answer / gatekeeper',
    'gatekeeper': 'no answer / gatekeeper',
    'decision maker': 'decision maker',
    'dm': 'decision maker',
    'nurturing': 'nurturing',
    'interested': 'interested',
    'strategy call booked': 'strategy call booked',
    'call booked': 'strategy call booked',
    'strategy call attended': 'strategy call attended',
    'call attended': 'strategy call attended',
    'proposal': 'proposal / scope',
    'proposal / scope': 'proposal / scope',
    'scope': 'proposal / scope',
    'closed won': 'closed won',
    'won': 'closed won',
    'closed lost': 'closed lost',
    'lost': 'closed lost'
  };
  
  return stageMapping[stage] || 'not contacted';
}

async function processChunk(
  supabase: any,
  chunk: ExcelRow[],
  startRow: number,
  existingCompanies: Map<string, string>,
  existingContacts: Map<string, string>
) {
  const results = {
    companiesCreated: 0,
    contactsCreated: 0,
    dealsCreated: 0,
    notesCreated: 0,
    errors: [] as string[],
  };

  // Batch data for inserts
  const newCompanies: any[] = [];
  const newContacts: any[] = [];
  const newDeals: any[] = [];
  const newNotes: any[] = [];

  // Process rows and prepare batch data
  for (let i = 0; i < chunk.length; i++) {
    const row = chunk[i];
    const rowNum = startRow + i;

    try {
      // Parse names
      let firstName = row['Client First Name'] || '';
      let lastName = row['Client Last Name'] || '';
      
      if (!firstName && !lastName && row["Client's Full Name"]) {
        const nameParts = row["Client's Full Name"].split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      if (!firstName || !lastName) {
        results.errors.push(`Row ${rowNum}: Missing client name`);
        continue;
      }

      const email = row["Client's Email"];
      const rawPhone = row["Client's Phone"];
      const phone = formatPhoneNumber(rawPhone);
      const timezone = row['Time Zone'] || 'UTC';
      const salesStage = mapSalesStage(row['Sales Stage']);
      
      console.log(`Row ${startRow + i}: Phone=${rawPhone} -> ${phone}, Stage=${row['Sales Stage']} -> ${salesStage}`);
      
      const companyName = row['Company Name'];
      const dealName = row['Deal Name'];
      const notes = row['Notes'];

      // Handle company
      let companyId = null;
      if (companyName) {
        companyId = existingCompanies.get(companyName);
        if (!companyId) {
          const tempId = `temp_company_${newCompanies.length}`;
          newCompanies.push({ name: companyName, timezone, tempId });
          companyId = tempId;
          existingCompanies.set(companyName, companyId);
        }
      }

      // Handle contact
      let contactId = null;
      const contactKey = email || `${firstName}_${lastName}_${phone}`;
      contactId = existingContacts.get(contactKey);
      
      if (!contactId) {
        const tempId = `temp_contact_${newContacts.length}`;
        newContacts.push({
          company_id: companyId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          timezone,
          tempId,
          contactKey,
        });
        contactId = tempId;
        existingContacts.set(contactKey, contactId);
      }

      // Prepare deal
      if (dealName) {
        newDeals.push({
          name: dealName,
          company_id: companyId,
          primary_contact_id: contactId,
          timezone,
          stage: salesStage,
          notes,
          tempCompanyId: companyId?.startsWith('temp_') ? companyId : null,
          tempContactId: contactId?.startsWith('temp_') ? contactId : null,
        });
      }

    } catch (error) {
      console.error(`Error processing row ${rowNum}:`, error);
      results.errors.push(`Row ${rowNum}: ${error.message}`);
    }
  }

  // Batch insert companies
  if (newCompanies.length > 0) {
    const companiesToInsert = newCompanies.map(({ tempId, ...c }) => c);
    const { data: insertedCompanies, error: companyError } = await supabase
      .from('companies')
      .insert(companiesToInsert)
      .select('id, name');

    if (companyError) {
      console.error('Company batch insert error:', companyError);
      results.errors.push(`Failed to insert companies: ${companyError.message}`);
    } else {
      results.companiesCreated += insertedCompanies.length;
      // Update company ID mappings
      insertedCompanies.forEach((company: any, idx: number) => {
        const tempId = newCompanies[idx].tempId;
        existingCompanies.set(company.name, company.id);
        // Update all references to temp IDs
        newContacts.forEach(c => {
          if (c.company_id === tempId) c.company_id = company.id;
        });
        newDeals.forEach(d => {
          if (d.company_id === tempId) d.company_id = company.id;
        });
      });
    }
  }

  // Batch insert contacts
  if (newContacts.length > 0) {
    const contactsToInsert = newContacts.map(({ tempId, contactKey, ...c }) => c);
    const { data: insertedContacts, error: contactError } = await supabase
      .from('contacts')
      .insert(contactsToInsert)
      .select('id, email, first_name, last_name, phone');

    if (contactError) {
      console.error('Contact batch insert error:', contactError);
      results.errors.push(`Failed to insert contacts: ${contactError.message}`);
    } else {
      results.contactsCreated += insertedContacts.length;
      // Update contact ID mappings
      insertedContacts.forEach((contact: any, idx: number) => {
        const tempId = newContacts[idx].tempId;
        const contactKey = newContacts[idx].contactKey;
        existingContacts.set(contactKey, contact.id);
        // Update all references to temp IDs
        newDeals.forEach(d => {
          if (d.primary_contact_id === tempId) d.primary_contact_id = contact.id;
        });
      });
    }
  }

  // Batch insert deals and notes
  if (newDeals.length > 0) {
    const dealsToInsert = newDeals.map(({ notes, tempCompanyId, tempContactId, ...d }) => d);
    const { data: insertedDeals, error: dealError } = await supabase
      .from('deals')
      .insert(dealsToInsert)
      .select('id');

    if (dealError) {
      console.error('Deal batch insert error:', dealError);
      results.errors.push(`Failed to insert deals: ${dealError.message}`);
    } else {
      results.dealsCreated += insertedDeals.length;
      
      // Batch insert notes for deals that have them
      const notesToInsert = [];
      insertedDeals.forEach((deal: any, idx: number) => {
        if (newDeals[idx].notes) {
          notesToInsert.push({
            deal_id: deal.id,
            contact_id: newDeals[idx].primary_contact_id,
            company_id: newDeals[idx].company_id,
            content: newDeals[idx].notes,
            note_type: 'manual',
          });
        }
      });

      if (notesToInsert.length > 0) {
        const { error: noteError } = await supabase
          .from('notes')
          .insert(notesToInsert);

        if (noteError) {
          console.error('Note batch insert error:', noteError);
          results.errors.push(`Failed to insert notes: ${noteError.message}`);
        } else {
          results.notesCreated += notesToInsert.length;
        }
      }
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No file provided');
    }

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Processing ${data.length} rows from Excel file in chunks of ${CHUNK_SIZE}`);

    // Pre-fetch existing companies and contacts to avoid repeated lookups
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name');
    const existingCompanies = new Map<string, string>(
      companies?.map((c: any) => [c.name, c.id]) || []
    );

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name, phone');
    const existingContacts = new Map<string, string>();
    contacts?.forEach((c: any) => {
      const key = c.email || `${c.first_name}_${c.last_name}_${c.phone}`;
      existingContacts.set(key, c.id);
    });

    const totalResults = {
      companiesCreated: 0,
      contactsCreated: 0,
      dealsCreated: 0,
      notesCreated: 0,
      errors: [] as string[],
    };

    // Process in chunks
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, Math.min(i + CHUNK_SIZE, data.length));
      const startRow = i + 2; // +2 for Excel row number (1-based + header)
      
      console.log(`Processing chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(data.length / CHUNK_SIZE)}`);
      
      const chunkResults = await processChunk(
        supabase,
        chunk,
        startRow,
        existingCompanies,
        existingContacts
      );

      // Aggregate results
      totalResults.companiesCreated += chunkResults.companiesCreated;
      totalResults.contactsCreated += chunkResults.contactsCreated;
      totalResults.dealsCreated += chunkResults.dealsCreated;
      totalResults.notesCreated += chunkResults.notesCreated;
      totalResults.errors.push(...chunkResults.errors);

      // Allow garbage collection between chunks
      if (i + CHUNK_SIZE < data.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    console.log('Import results:', totalResults);

    return new Response(JSON.stringify(totalResults), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
