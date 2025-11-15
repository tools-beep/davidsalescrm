# Setup Guide: Automatic Stage Enum Addition

This guide will set up automatic stage addition so you never have to manually add stages again!

## 🎯 What This Does

When you create or edit a pipeline with new stage names, they will be **automatically added** to the database enum. No more manual SQL!

## 📋 Setup Steps

### Step 1: Run the Migration (30 seconds)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this SQL:

```sql
-- Create a function to execute raw SQL (only accessible by service role)
CREATE OR REPLACE FUNCTION public.exec_raw_sql(query TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
BEGIN
    EXECUTE query;
    RETURN json_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Only allow service role to execute this function
REVOKE ALL ON FUNCTION public.exec_raw_sql(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.exec_raw_sql(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.exec_raw_sql(TEXT) TO service_role;
```

3. Click **Run**

### Step 2: Deploy the Edge Function (2 minutes)

Open your terminal and run:

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai

# Login to Supabase (if not already logged in)
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy the Edge Function
npx supabase functions deploy add-stages-to-enum
```

**Note:** Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID (found in your project settings).

### Step 3: Fix Current Stages (30 seconds)

Run the `RUN_THIS_NOW.sql` script in Supabase SQL Editor to add all your current stages:

```sql
-- Copy the entire content of RUN_THIS_NOW.sql and run it
```

This adds all existing stages including: hello, hi, whats, up, uncontacted, dmconnected, proposal, etc.

## ✅ Testing

After setup:

1. **Create a new pipeline** with custom stage names (e.g., "test1", "test2", "test3")
2. **Watch the console** - you'll see: "Adding stages to enum via Edge Function"
3. **Create a deal** in that pipeline
4. **Success!** No enum errors!

## 🎉 Benefits

- ✅ **No more manual SQL** - stages add automatically
- ✅ **Create unlimited pipelines** - any stage names work
- ✅ **Instant deal creation** - works immediately
- ✅ **Perfect dragging** - all stages work
- ✅ **Future-proof** - never worry about enums again

## 🔧 How It Works

```
1. You create pipeline with stages: ["new", "working", "done"]
   ↓
2. PipelineManager calls Edge Function: add-stages-to-enum
   ↓
3. Edge Function adds each stage to enum using service role
   ↓
4. Pipeline is created with validated stages
   ↓
5. You can immediately create deals and drag them!
```

## 🐛 Troubleshooting

### Edge Function not found
- Make sure you deployed it: `npx supabase functions deploy add-stages-to-enum`
- Check it exists in Supabase Dashboard → Edge Functions

### Still getting enum errors
- Check console for Edge Function errors
- Verify the migration ran successfully
- Try running `RUN_THIS_NOW.sql` to add stages manually

### Permission errors
- Ensure `exec_raw_sql` function has correct permissions
- Only service role should have EXECUTE permission

## 📞 Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Check Supabase Edge Function logs
3. Verify the migration ran successfully
4. Try adding stages manually as fallback

---

**After setup, you'll never have to worry about enum errors again!** 🎊

