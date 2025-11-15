import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { stages } = await req.json()

    if (!stages || !Array.isArray(stages)) {
      throw new Error('stages array is required')
    }

    console.log('[add-stages-to-enum] Received stages:', stages)

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const results = []
    const errors = []

    // Process each stage
    for (const stage of stages) {
      const normalizedStage = stage.toLowerCase().trim()
      
      if (!normalizedStage) {
        console.log('[add-stages-to-enum] Skipping empty stage')
        continue
      }

      try {
        // Check if stage already exists using raw SQL
        const { data: existingStages, error: checkError } = await supabaseAdmin
          .rpc('exec_raw_sql', {
            query: `
              SELECT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'deal_stage_enum'
                AND e.enumlabel = '${normalizedStage.replace(/'/g, "''")}'
              ) as exists
            `
          })

        if (checkError) {
          console.error('[add-stages-to-enum] Error checking stage:', checkError)
          // Try to add anyway
        }

        if (existingStages && existingStages[0]?.exists) {
          console.log('[add-stages-to-enum] Stage already exists:', normalizedStage)
          results.push({ stage: normalizedStage, status: 'already_exists' })
          continue
        }

        // Add the stage to the enum using raw SQL
        const { error: addError } = await supabaseAdmin
          .rpc('exec_raw_sql', {
            query: `ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS '${normalizedStage.replace(/'/g, "''")}'`
          })

        if (addError) {
          console.error('[add-stages-to-enum] Error adding stage:', normalizedStage, addError)
          errors.push({ stage: normalizedStage, error: addError.message })
        } else {
          console.log('[add-stages-to-enum] Successfully added stage:', normalizedStage)
          results.push({ stage: normalizedStage, status: 'added' })
        }
      } catch (err) {
        console.error('[add-stages-to-enum] Exception adding stage:', normalizedStage, err)
        errors.push({ stage: normalizedStage, error: err.message })
      }
    }

    const response = {
      success: errors.length === 0,
      results,
      errors,
      message: `Processed ${stages.length} stages. Added: ${results.filter(r => r.status === 'added').length}, Already existed: ${results.filter(r => r.status === 'already_exists').length}, Errors: ${errors.length}`
    }

    console.log('[add-stages-to-enum] Response:', response)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('[add-stages-to-enum] Error in function:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        results: [],
        errors: [{ error: error.message }]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even on error so the pipeline creation continues
      },
    )
  }
})

