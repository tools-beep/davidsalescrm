-- Check the actual structure of eod_submissions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'eod_submissions'
ORDER BY ordinal_position;

