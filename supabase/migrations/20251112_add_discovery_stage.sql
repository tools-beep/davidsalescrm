-- Add 'discovery' as a separate deal stage enum value
-- This will allow "Discovery" and "DM Connected" to be separate stages in pipelines
ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS 'discovery';

-- Add comment for documentation
COMMENT ON TYPE deal_stage_enum IS 'Deal stage enum includes discovery as a separate stage from dm connected';

`
