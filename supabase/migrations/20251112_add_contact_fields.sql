-- Add missing contact fields for enhanced contact management
-- This migration adds description and additional phone tracking

-- Add description field for contact notes/bio
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS description TEXT;

-- Add additional_phones as JSON array for multiple phone numbers
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS additional_phones JSONB DEFAULT '[]'::jsonb;

-- Ensure last_contacted_at exists (should already be there from types)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance on last_contacted_at
CREATE INDEX IF NOT EXISTS idx_contacts_last_contacted ON public.contacts(last_contacted_at DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.contacts.description IS 'Bio or description of the contact';
COMMENT ON COLUMN public.contacts.additional_phones IS 'Array of additional phone numbers stored as JSON';
COMMENT ON COLUMN public.contacts.last_contacted_at IS 'Automatically updated when a call or email is logged';

