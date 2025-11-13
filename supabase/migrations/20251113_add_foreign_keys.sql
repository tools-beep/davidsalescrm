-- Add foreign key constraints to user reference columns
-- This migration adds the foreign keys separately after ensuring columns exist

-- Contacts owner_id foreign key
ALTER TABLE public.contacts 
DROP CONSTRAINT IF EXISTS contacts_owner_id_fkey;

ALTER TABLE public.contacts 
ADD CONSTRAINT contacts_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Deals team foreign keys
ALTER TABLE public.deals 
DROP CONSTRAINT IF EXISTS deals_deal_owner_id_fkey;

ALTER TABLE public.deals 
ADD CONSTRAINT deals_deal_owner_id_fkey 
FOREIGN KEY (deal_owner_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.deals 
DROP CONSTRAINT IF EXISTS deals_setter_id_fkey;

ALTER TABLE public.deals 
ADD CONSTRAINT deals_setter_id_fkey 
FOREIGN KEY (setter_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.deals 
DROP CONSTRAINT IF EXISTS deals_account_manager_id_fkey;

ALTER TABLE public.deals 
ADD CONSTRAINT deals_account_manager_id_fkey 
FOREIGN KEY (account_manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;

