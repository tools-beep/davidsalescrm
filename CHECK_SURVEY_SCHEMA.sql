-- Check the actual column names in mood_entries and energy_entries

SELECT 
    'mood_entries columns' AS table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'mood_entries'
ORDER BY ordinal_position;

SELECT 
    'energy_entries columns' AS table_info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'energy_entries'
ORDER BY ordinal_position;

-- Try to manually insert a test record to see what error we get
-- (This will help diagnose the issue)

