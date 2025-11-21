-- Fix contacts owner_id foreign key to reference user_profiles instead of auth.users
-- This aligns with how the application fetches and validates users

-- Drop the existing constraint that references auth.users
ALTER TABLE public.contacts 
DROP CONSTRAINT IF EXISTS contacts_owner_id_fkey;

-- Add new constraint that references user_profiles
-- user_profiles.id is linked to auth.users.id, so the data is consistent
ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Add comment explaining the change
COMMENT ON CONSTRAINT contacts_owner_id_fkey ON public.contacts IS 
'References user_profiles instead of auth.users for consistency with application logic';

