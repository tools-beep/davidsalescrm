-- Step 1: Find ALL deals with "NextHome" or "nexthome" in the name
SELECT 
    d.id as deal_id,
    d.name as deal_name,
    c.id as company_id,
    c.name as company_name,
    LENGTH(c.name) as company_name_length,
    p.id as pipeline_id,
    p.name as pipeline_name,
    d.stage
FROM deals d
LEFT JOIN companies c ON c.id = d.company_id
LEFT JOIN pipelines p ON p.id = d.pipeline_id
WHERE d.name ILIKE '%nexthome%'
ORDER BY d.created_at DESC;

