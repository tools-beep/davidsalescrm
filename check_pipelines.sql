-- Check current pipelines and their stages
SELECT id, name, stages, stage_order, is_active
FROM pipelines
WHERE is_active = true
ORDER BY created_at;
