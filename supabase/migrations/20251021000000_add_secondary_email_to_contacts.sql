-- Add secondary_email field to contacts table
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS secondary_email TEXT;

-- Add additional social media and contact fields that might be missing
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS tiktok_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS call_status TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add notes column to deals table for bulk upload functionality
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index on secondary_email for faster lookups
CREATE INDEX IF NOT EXISTS idx_contacts_secondary_email ON public.contacts(secondary_email);

