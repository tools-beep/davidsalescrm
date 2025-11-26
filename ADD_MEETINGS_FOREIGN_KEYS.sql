-- =====================================================
-- ADD FOREIGN KEY RELATIONSHIPS TO MEETINGS TABLE
-- =====================================================

-- Add foreign key constraint for account_manager_id
-- This links to user_profiles.user_id
ALTER TABLE meetings
ADD CONSTRAINT fk_meetings_account_manager
FOREIGN KEY (account_manager_id) 
REFERENCES user_profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key constraint for related_contact_id
ALTER TABLE meetings
ADD CONSTRAINT fk_meetings_contact
FOREIGN KEY (related_contact_id) 
REFERENCES contacts(id)
ON DELETE SET NULL;

-- Add foreign key constraint for related_deal_id
ALTER TABLE meetings
ADD CONSTRAINT fk_meetings_deal
FOREIGN KEY (related_deal_id) 
REFERENCES deals(id)
ON DELETE SET NULL;

-- Add foreign key constraint for related_company_id
ALTER TABLE meetings
ADD CONSTRAINT fk_meetings_company
FOREIGN KEY (related_company_id) 
REFERENCES companies(id)
ON DELETE SET NULL;

-- Verify foreign keys were created
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  a.attname AS column_name,
  af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.conrelid = 'meetings'::regclass
  AND c.contype = 'f'
ORDER BY conname;

