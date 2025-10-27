-- ============================================
-- CHECK ACTUAL ENUM VALUES IN DATABASE
-- ============================================
-- This shows the EXACT enum values stored in the database
-- ============================================

-- Show all deal_stage_enum values
SELECT 
  enumlabel as stage_value,
  LENGTH(enumlabel) as length,
  -- Check for hyphens vs slashes
  CASE 
    WHEN enumlabel LIKE '%-%' THEN 'Contains HYPHEN (-)' 
    WHEN enumlabel LIKE '%/%' THEN 'Contains SLASH (/)'
    ELSE 'No special chars'
  END as special_chars
FROM pg_enum 
WHERE enumtypid = 'deal_stage_enum'::regtype 
ORDER BY enumlabel;

-- Show Client Success Pipeline stages specifically
SELECT 
  enumlabel as client_success_stages
FROM pg_enum 
WHERE enumtypid = 'deal_stage_enum'::regtype 
AND enumlabel IN (
  'onboarding call booked',
  'onboarding call attended',
  'active client (operator)',
  'active client - project in progress',
  'paused client',
  'candidate replacement',
  'project rescope / expansion',
  'active client - project maintenance',
  'cancelled / completed'
)
ORDER BY enumlabel;

-- Check what stages are actually being used in deals
SELECT 
  stage::text as actual_stage_in_db,
  COUNT(*) as deal_count,
  -- Check for special characters
  CASE 
    WHEN stage::text LIKE '%-%' THEN 'Has HYPHEN (-)' 
    WHEN stage::text LIKE '%/%' THEN 'Has SLASH (/)'
    ELSE 'No special chars'
  END as char_type
FROM deals
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
GROUP BY stage
ORDER BY deal_count DESC;

