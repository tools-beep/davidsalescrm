-- Check what values energy_entries table expects

-- 1. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'energy_entries'
ORDER BY ordinal_position;

-- 2. Check if there's a CHECK constraint on energy_level
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
INNER JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'energy_entries'
  AND con.contype = 'c';

-- 3. Show any existing energy entries to see what values are stored
SELECT 
  energy_level,
  COUNT(*) as count
FROM energy_entries
GROUP BY energy_level
ORDER BY count DESC;

