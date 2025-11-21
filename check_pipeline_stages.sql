-- Check the pipeline's stage configuration
SELECT 
    id,
    name,
    stage_order
FROM pipelines
WHERE name ILIKE '%fulfillment%operator%';

-- Check valid enum values for deal stages
SELECT 
    enumlabel as valid_stage_value
FROM pg_enum
WHERE enumtypid = 'deal_stage_enum'::regtype
ORDER BY enumsortorder;

