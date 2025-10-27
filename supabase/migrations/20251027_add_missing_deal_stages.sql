-- Add missing deal stages that are used in pipelines but not in the enum
ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS 'candidate interview booked';
ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS 'candidate interview attended';
ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS 'deal won';

