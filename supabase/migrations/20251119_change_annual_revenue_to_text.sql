-- Change annual_revenue from DECIMAL to TEXT to support revenue ranges
-- This allows values like: <100k, 100-250k, 251-500k, 500k-1M, 1M+

ALTER TABLE public.deals 
ALTER COLUMN annual_revenue TYPE TEXT 
USING CASE 
  WHEN annual_revenue IS NULL THEN NULL
  ELSE annual_revenue::TEXT
END;

-- Update comment for the column
COMMENT ON COLUMN public.deals.annual_revenue IS 'Annual revenue range of the client company (<100k, 100-250k, 251-500k, 500k-1M, 1M+)';
