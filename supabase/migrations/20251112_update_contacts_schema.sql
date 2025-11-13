-- Update Contacts table with comprehensive fields
-- Adding all missing fields for complete contact management

-- Add owner_id if not exists (without foreign key constraint for now)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS owner_id UUID;

-- Rename existing fields for clarity
-- Note: email -> primary_email, phone -> primary_phone
-- We'll keep the old columns for backward compatibility and migrate data

-- Add new email fields
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS primary_email TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS secondary_email TEXT;

-- Add new phone fields  
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS primary_phone TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS secondary_phone TEXT;

-- Add social media URLs
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS x_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add location fields (expand existing)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- last_contacted_at should already exist
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE;

-- Migrate existing data to new columns
UPDATE public.contacts 
SET primary_email = email 
WHERE primary_email IS NULL AND email IS NOT NULL;

UPDATE public.contacts 
SET primary_phone = phone 
WHERE primary_phone IS NULL AND phone IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_owner_id ON public.contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_primary_email ON public.contacts(primary_email);
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_last_contacted ON public.contacts(last_contacted_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN public.contacts.owner_id IS 'User who owns this contact';
COMMENT ON COLUMN public.contacts.primary_email IS 'Primary email address';
COMMENT ON COLUMN public.contacts.secondary_email IS 'Secondary email address';
COMMENT ON COLUMN public.contacts.primary_phone IS 'Primary phone number';
COMMENT ON COLUMN public.contacts.secondary_phone IS 'Secondary phone number';
COMMENT ON COLUMN public.contacts.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN public.contacts.facebook_url IS 'Facebook profile URL';
COMMENT ON COLUMN public.contacts.website_url IS 'Personal website URL';
COMMENT ON COLUMN public.contacts.tiktok_url IS 'TikTok profile URL';
COMMENT ON COLUMN public.contacts.x_url IS 'X (Twitter) profile URL';
COMMENT ON COLUMN public.contacts.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.contacts.address IS 'Street address';
COMMENT ON COLUMN public.contacts.zip_code IS 'ZIP or postal code';
COMMENT ON COLUMN public.contacts.last_contacted_at IS 'Last time this contact was called or emailed';

