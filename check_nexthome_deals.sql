-- Check NextHome deals: what pipeline are they in and what stages do they have?
SELECT 
    d.id,
    d.name as deal_name,
    d.stage,
    d.pipeline_id,
    p.name as pipeline_name,
    c.name as company_name
FROM deals d
LEFT JOIN companies c ON c.id = d.company_id
LEFT JOIN pipelines p ON p.id = d.pipeline_id
WHERE (c.name ILIKE '%nexthome%' OR d.name ILIKE '%nexthome%')
ORDER BY d.created_at DESC
LIMIT 20;
