-- Check Discovery stage data
-- Run this in Supabase SQL Editor to see what's in your database

-- 1. Count deals by stage
SELECT stage, COUNT(*) as count
FROM deals
WHERE stage IN ('discovery', 'dm connected')
GROUP BY stage
ORDER BY stage;

-- 2. Check all distinct stages in deals table
SELECT DISTINCT stage, COUNT(*) as count
FROM deals
GROUP BY stage
ORDER BY stage;

-- 3. List first 20 Discovery deals
SELECT id, name, stage, amount, pipeline_id, created_at
FROM deals
WHERE stage = 'discovery'
ORDER BY created_at DESC
LIMIT 20;

-- 4. List first 20 DM Connected deals
SELECT id, name, stage, amount, pipeline_id, created_at
FROM deals
WHERE stage = 'dm connected'
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check Outbound Funnel pipeline stages
SELECT id, name, stages
FROM pipelines
WHERE name = 'Outbound Funnel';

