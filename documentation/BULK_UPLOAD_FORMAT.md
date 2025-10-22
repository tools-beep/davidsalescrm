# Bulk Upload Format Documentation

## Overview
The bulk upload feature now supports a comprehensive format with color-coded columns to organize data into three main sections: Company, Deal, and Contact information.

## New Database Fields
The following fields have been added to the contacts table:
- `secondary_email` - Additional email address for the contact
- `secondary_phone` - Additional phone number for the contact (note: `secondary_phone` was already in the database)
- `website` - Contact's website
- `linkedin_url` - LinkedIn profile URL
- `instagram_url` - Instagram profile URL
- `tiktok_url` - TikTok profile URL
- `facebook_url` - Facebook profile URL
- `call_status` - Current status of call outreach
- `notes` - General notes about the contact

## Excel Column Format

### Company Fields (Grey Color)
These columns should be highlighted in **grey** in your Excel file:

1. **Company Name** - Name of the company (required if creating companies)
2. **Company Phone Number** - Main phone number for the company
3. **Company Email** - Main email address for the company

### Deal Fields (Green Color)
These columns should be highlighted in **green** in your Excel file:

1. **Deal Source** - Where the deal came from (e.g., referral, cold call, etc.)
2. **Revenue** - Expected revenue from the deal (numbers only, $ and commas will be stripped)
3. **Deal Name** - Name/description of the deal (required if creating deals)
4. **Deal Stage** - Current stage of the deal (see Stage Mapping below)
5. **Priority** - Deal priority: "High", "Medium", or "Low"
6. **Vertical** - Industry vertical or category
7. **Deal Notes** - General notes about the deal
8. **Outreach Type** - Type of outreach performed
9. **Outreach Outcome** - Result of the outreach
10. **Call Log Notes 1** - First set of call notes
11. **Call Log Notes 2** - Second set of call notes

### Contact Fields (Black Color)
These columns should be highlighted in **black** in your Excel file:

1. **Contact First Name** - Contact's first name (required)
2. **Contact Last Name** - Contact's last name (required)
3. **Contact Email** - Primary email address
4. **Contact Secondary Email** - Secondary/alternate email address
5. **Contact Phone Number** - Primary phone number
6. **Contact Secondary Phone Number** - Secondary/alternate phone number
7. **Notes 0** - General notes about the contact
8. **Call Status** - Status of call attempts with this contact
9. **Contact Website** - Contact's personal or business website
10. **Contact Linkedin** - LinkedIn profile URL
11. **Contacted Instagram** - Instagram profile handle/URL
12. **Contact Tiktok** - TikTok profile handle/URL
13. **Contact Facebook** - Facebook profile URL

## Deal Stage Mapping

The system will automatically map your Excel stage values to the correct database enum values. See `STAGE_MAPPING_REFERENCE.md` for the complete list of valid stages.

Common mappings include:
- "Not Contacted" → `not contacted`
- "No Answer/Gatekeeper" → `no answer / gatekeeper`
- "Decision Maker" or "DM" → `decision maker`
- "Strategy Call Booked" → `strategy call booked`
- "Proposal" or "Scope" → `proposal / scope`
- "Won" → `closed won`
- "Lost" → `closed lost`

## Priority Mapping
- Any value containing "high" → High priority
- Any value containing "low" → Low priority
- Everything else → Medium priority (default)

## Phone Number Formatting
All phone numbers are automatically formatted:
- 10-digit numbers (e.g., 6041234567) → +16041234567
- 11-digit numbers starting with 1 → +1 prefix added
- Other formats are preserved with + prefix if not present

## Notes Consolidation
The following notes fields are automatically combined:
1. Deal Notes
2. Call Log Notes 1 (prefixed with "Call Log 1:")
3. Call Log Notes 2 (prefixed with "Call Log 2:")
4. Vertical (added as metadata)
5. Outreach Type (added as metadata)
6. Outreach Outcome (added as metadata)

All notes are separated by double line breaks for readability.

## Legacy Format Support
The system still supports the old column names for backward compatibility:
- "Client's Full Name" or "Client First Name" & "Client Last Name"
- "Client's Email"
- "Client's Phone"
- "Sales Stage"
- "Time Zone"
- "Notes"

## Color Detection Algorithm
The system uses cell background colors to automatically categorize columns:
- **Black** (RGB max < 40): Contact fields
- **Grey** (low saturation, max-min < 20): Company fields
- **Green** (G > R+30 and G > B+30): Deal fields

## Required Fields
At minimum, each row should have:
- Contact First Name AND Last Name (or Full Name)
- At least ONE of: Email, Phone, Company Name, or Deal Name

## Usage Tips

1. **Color your headers**: Make sure to apply the correct background colors to your header row
2. **Pipeline Selection**: Select the target pipeline before uploading - all deals will be added to this pipeline
3. **Data Validation**: The system will skip rows that don't have sufficient data
4. **Duplicate Handling**: 
   - Companies are matched by name
   - Contacts are matched by email or name+phone combination
5. **Progress Tracking**: Watch the progress bar during upload
6. **Error Messages**: Any errors will be displayed after the upload completes

## Example Excel Structure

```
| Company Name | Company Phone | Company Email | Deal Source | Revenue | Deal Name | Deal Stage | Priority | ... | Contact First Name | Contact Last Name | Contact Email | Contact Secondary Email | ... |
|--------------|--------------|---------------|-------------|---------|-----------|------------|----------|-----|-------------------|------------------|---------------|----------------------|-----|
| Grey Cell    | Grey Cell    | Grey Cell     | Green Cell  | Green   | Green     | Green      | Green    | ... | Black Cell        | Black Cell       | Black Cell    | Black Cell           | ... |
```

## ContactForm Updates
The Contact form now includes fields for:
- Secondary Email
- Secondary Phone

These fields are optional and can be used when manually creating or editing contacts.

## Migration
A database migration has been created at:
`supabase/migrations/20251021000000_add_secondary_email_to_contacts.sql`

This migration adds all the new contact fields and creates indexes for performance.

## Deployment
To deploy the migration to your Supabase project:
```bash
npx supabase db push
```

Or through the Supabase dashboard:
1. Go to Database → Migrations
2. Create a new migration
3. Copy the contents of the migration file
4. Run the migration

