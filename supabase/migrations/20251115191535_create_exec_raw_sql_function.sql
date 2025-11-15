-- Create a function to execute raw SQL (only accessible by service role)
-- This is needed for the Edge Function to add enum values

CREATE OR REPLACE FUNCTION public.exec_raw_sql(query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    -- Execute the query
    EXECUTE query;
    
    -- Return success
    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        -- Return error
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Only allow service role to execute this function
REVOKE ALL ON FUNCTION public.exec_raw_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_raw_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_raw_sql(TEXT) TO service_role;

COMMENT ON FUNCTION public.exec_raw_sql(TEXT) IS 'Executes raw SQL - only accessible by service role for Edge Functions';
