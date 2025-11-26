-- Check if phone numbers are being saved correctly

-- Check contacts table schema for phone fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name LIKE '%phone%'
ORDER BY column_name;

-- Check companies table schema for phone fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'companies' 
AND column_name LIKE '%phone%'
ORDER BY column_name;

-- Check recent contacts with phone numbers
SELECT 
    id,
    first_name,
    last_name,
    phone as old_phone_field,
    primary_phone,
    secondary_phone,
    mobile,
    created_at
FROM public.contacts
ORDER BY created_at DESC
LIMIT 10;

-- Check recent companies with phone numbers
SELECT 
    id,
    name,
    phone,
    created_at
FROM public.companies
ORDER BY created_at DESC
LIMIT 10;

