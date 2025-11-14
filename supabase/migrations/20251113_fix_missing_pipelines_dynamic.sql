-- Dynamic fix: Assigns correct pipeline_id based on actual pipeline names in your database
-- This works regardless of what UUIDs your pipelines have

DO $$
DECLARE
  outbound_funnel_id UUID;
  client_success_id UUID;
  deals_updated INTEGER := 0;
BEGIN
  -- Find the Outbound Funnel pipeline ID (it might have different names)
  SELECT id INTO outbound_funnel_id
  FROM pipelines
  WHERE name ILIKE '%outbound%' OR name ILIKE '%sales%' OR name ILIKE '%funnel%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Find the Client Success pipeline ID
  SELECT id INTO client_success_id
  FROM pipelines
  WHERE name ILIKE '%client%success%' OR name ILIKE '%client%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Show what we found
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FOUND PIPELINES';
  RAISE NOTICE '========================================';
  
  IF outbound_funnel_id IS NOT NULL THEN
    RAISE NOTICE '✅ Outbound/Sales Pipeline ID: %', outbound_funnel_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Outbound/Sales pipeline!';
  END IF;
  
  IF client_success_id IS NOT NULL THEN
    RAISE NOTICE '✅ Client Success Pipeline ID: %', client_success_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Client Success pipeline!';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Only proceed if we found at least the outbound pipeline
  IF outbound_funnel_id IS NULL THEN
    RAISE EXCEPTION 'Cannot proceed: No sales/outbound pipeline found. Please create pipelines first.';
  END IF;
  
  -- Fix "uncontacted" deals (assign to outbound pipeline)
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE stage = 'uncontacted'
    AND (pipeline_id IS NULL OR pipeline_id != outbound_funnel_id);
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % "uncontacted" deals to Outbound pipeline', deals_updated;
  
  -- Fix other Outbound Funnel stages
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE pipeline_id IS NULL
    AND stage IN (
      'no answer / gatekeeper',
      'dm connected',
      'discovery',
      'strategy call booked',
      'strategy call attended',
      'bizops audit agreement sent',
      'bizops audit paid / booked',
      'bizops audit attended',
      'ms agreement sent',
      'balance paid / deal won',
      'not interested',
      'not qualified',
      'not contacted',
      'decision maker',
      'nurturing',
      'interested',
      'proposal / scope',
      'closed won',
      'closed lost'
    );
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % other Outbound stages', deals_updated;
  
  -- Fix Client Success stages (if we found that pipeline)
  IF client_success_id IS NOT NULL THEN
    UPDATE deals
    SET pipeline_id = client_success_id
    WHERE pipeline_id IS NULL
      AND stage IN (
        'onboarding call booked',
        'onboarding call attended',
        'active client (operator)',
        'active client - project in progress',
        'paused client',
        'candidate replacement',
        'project rescope / expansion',
        'active client - project maintenance',
        'cancelled / completed'
      );
    
    GET DIAGNOSTICS deals_updated = ROW_COUNT;
    RAISE NOTICE '✅ Updated % Client Success stages', deals_updated;
  END IF;
  
  -- Show final summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FINAL SUMMARY';
  RAISE NOTICE '========================================';
  
  -- Count "uncontacted" deals now
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted' AND pipeline_id = outbound_funnel_id;
  
  RAISE NOTICE '"uncontacted" deals in Outbound: %', deals_updated;
  
  -- Count total "uncontacted"
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted';
  
  RAISE NOTICE 'Total "uncontacted" deals: %', deals_updated;
  
  -- Check for any remaining NULL pipeline_ids
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE pipeline_id IS NULL;
  
  IF deals_updated > 0 THEN
    RAISE WARNING '⚠️  Still have % deals with NULL pipeline_id', deals_updated;
    RAISE NOTICE 'Stages with NULL pipeline_id:';
    
    FOR r IN (
      SELECT stage, COUNT(*) as count 
      FROM deals 
      WHERE pipeline_id IS NULL 
      GROUP BY stage 
      ORDER BY count DESC 
      LIMIT 10
    )
    LOOP
      RAISE NOTICE '   • "%": % deals', r.stage, r.count;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All deals now have a pipeline_id!';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;



DO $$
DECLARE
  outbound_funnel_id UUID;
  client_success_id UUID;
  deals_updated INTEGER := 0;
BEGIN
  -- Find the Outbound Funnel pipeline ID (it might have different names)
  SELECT id INTO outbound_funnel_id
  FROM pipelines
  WHERE name ILIKE '%outbound%' OR name ILIKE '%sales%' OR name ILIKE '%funnel%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Find the Client Success pipeline ID
  SELECT id INTO client_success_id
  FROM pipelines
  WHERE name ILIKE '%client%success%' OR name ILIKE '%client%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Show what we found
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FOUND PIPELINES';
  RAISE NOTICE '========================================';
  
  IF outbound_funnel_id IS NOT NULL THEN
    RAISE NOTICE '✅ Outbound/Sales Pipeline ID: %', outbound_funnel_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Outbound/Sales pipeline!';
  END IF;
  
  IF client_success_id IS NOT NULL THEN
    RAISE NOTICE '✅ Client Success Pipeline ID: %', client_success_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Client Success pipeline!';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Only proceed if we found at least the outbound pipeline
  IF outbound_funnel_id IS NULL THEN
    RAISE EXCEPTION 'Cannot proceed: No sales/outbound pipeline found. Please create pipelines first.';
  END IF;
  
  -- Fix "uncontacted" deals (assign to outbound pipeline)
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE stage = 'uncontacted'
    AND (pipeline_id IS NULL OR pipeline_id != outbound_funnel_id);
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % "uncontacted" deals to Outbound pipeline', deals_updated;
  
  -- Fix other Outbound Funnel stages
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE pipeline_id IS NULL
    AND stage IN (
      'no answer / gatekeeper',
      'dm connected',
      'discovery',
      'strategy call booked',
      'strategy call attended',
      'bizops audit agreement sent',
      'bizops audit paid / booked',
      'bizops audit attended',
      'ms agreement sent',
      'balance paid / deal won',
      'not interested',
      'not qualified',
      'not contacted',
      'decision maker',
      'nurturing',
      'interested',
      'proposal / scope',
      'closed won',
      'closed lost'
    );
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % other Outbound stages', deals_updated;
  
  -- Fix Client Success stages (if we found that pipeline)
  IF client_success_id IS NOT NULL THEN
    UPDATE deals
    SET pipeline_id = client_success_id
    WHERE pipeline_id IS NULL
      AND stage IN (
        'onboarding call booked',
        'onboarding call attended',
        'active client (operator)',
        'active client - project in progress',
        'paused client',
        'candidate replacement',
        'project rescope / expansion',
        'active client - project maintenance',
        'cancelled / completed'
      );
    
    GET DIAGNOSTICS deals_updated = ROW_COUNT;
    RAISE NOTICE '✅ Updated % Client Success stages', deals_updated;
  END IF;
  
  -- Show final summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FINAL SUMMARY';
  RAISE NOTICE '========================================';
  
  -- Count "uncontacted" deals now
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted' AND pipeline_id = outbound_funnel_id;
  
  RAISE NOTICE '"uncontacted" deals in Outbound: %', deals_updated;
  
  -- Count total "uncontacted"
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted';
  
  RAISE NOTICE 'Total "uncontacted" deals: %', deals_updated;
  
  -- Check for any remaining NULL pipeline_ids
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE pipeline_id IS NULL;
  
  IF deals_updated > 0 THEN
    RAISE WARNING '⚠️  Still have % deals with NULL pipeline_id', deals_updated;
    RAISE NOTICE 'Stages with NULL pipeline_id:';
    
    FOR r IN (
      SELECT stage, COUNT(*) as count 
      FROM deals 
      WHERE pipeline_id IS NULL 
      GROUP BY stage 
      ORDER BY count DESC 
      LIMIT 10
    )
    LOOP
      RAISE NOTICE '   • "%": % deals', r.stage, r.count;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All deals now have a pipeline_id!';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;





DO $$
DECLARE
  outbound_funnel_id UUID;
  client_success_id UUID;
  deals_updated INTEGER := 0;
BEGIN
  -- Find the Outbound Funnel pipeline ID (it might have different names)
  SELECT id INTO outbound_funnel_id
  FROM pipelines
  WHERE name ILIKE '%outbound%' OR name ILIKE '%sales%' OR name ILIKE '%funnel%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Find the Client Success pipeline ID
  SELECT id INTO client_success_id
  FROM pipelines
  WHERE name ILIKE '%client%success%' OR name ILIKE '%client%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Show what we found
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FOUND PIPELINES';
  RAISE NOTICE '========================================';
  
  IF outbound_funnel_id IS NOT NULL THEN
    RAISE NOTICE '✅ Outbound/Sales Pipeline ID: %', outbound_funnel_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Outbound/Sales pipeline!';
  END IF;
  
  IF client_success_id IS NOT NULL THEN
    RAISE NOTICE '✅ Client Success Pipeline ID: %', client_success_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Client Success pipeline!';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Only proceed if we found at least the outbound pipeline
  IF outbound_funnel_id IS NULL THEN
    RAISE EXCEPTION 'Cannot proceed: No sales/outbound pipeline found. Please create pipelines first.';
  END IF;
  
  -- Fix "uncontacted" deals (assign to outbound pipeline)
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE stage = 'uncontacted'
    AND (pipeline_id IS NULL OR pipeline_id != outbound_funnel_id);
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % "uncontacted" deals to Outbound pipeline', deals_updated;
  
  -- Fix other Outbound Funnel stages
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE pipeline_id IS NULL
    AND stage IN (
      'no answer / gatekeeper',
      'dm connected',
      'discovery',
      'strategy call booked',
      'strategy call attended',
      'bizops audit agreement sent',
      'bizops audit paid / booked',
      'bizops audit attended',
      'ms agreement sent',
      'balance paid / deal won',
      'not interested',
      'not qualified',
      'not contacted',
      'decision maker',
      'nurturing',
      'interested',
      'proposal / scope',
      'closed won',
      'closed lost'
    );
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % other Outbound stages', deals_updated;
  
  -- Fix Client Success stages (if we found that pipeline)
  IF client_success_id IS NOT NULL THEN
    UPDATE deals
    SET pipeline_id = client_success_id
    WHERE pipeline_id IS NULL
      AND stage IN (
        'onboarding call booked',
        'onboarding call attended',
        'active client (operator)',
        'active client - project in progress',
        'paused client',
        'candidate replacement',
        'project rescope / expansion',
        'active client - project maintenance',
        'cancelled / completed'
      );
    
    GET DIAGNOSTICS deals_updated = ROW_COUNT;
    RAISE NOTICE '✅ Updated % Client Success stages', deals_updated;
  END IF;
  
  -- Show final summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FINAL SUMMARY';
  RAISE NOTICE '========================================';
  
  -- Count "uncontacted" deals now
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted' AND pipeline_id = outbound_funnel_id;
  
  RAISE NOTICE '"uncontacted" deals in Outbound: %', deals_updated;
  
  -- Count total "uncontacted"
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted';
  
  RAISE NOTICE 'Total "uncontacted" deals: %', deals_updated;
  
  -- Check for any remaining NULL pipeline_ids
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE pipeline_id IS NULL;
  
  IF deals_updated > 0 THEN
    RAISE WARNING '⚠️  Still have % deals with NULL pipeline_id', deals_updated;
    RAISE NOTICE 'Stages with NULL pipeline_id:';
    
    FOR r IN (
      SELECT stage, COUNT(*) as count 
      FROM deals 
      WHERE pipeline_id IS NULL 
      GROUP BY stage 
      ORDER BY count DESC 
      LIMIT 10
    )
    LOOP
      RAISE NOTICE '   • "%": % deals', r.stage, r.count;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All deals now have a pipeline_id!';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;



DO $$
DECLARE
  outbound_funnel_id UUID;
  client_success_id UUID;
  deals_updated INTEGER := 0;
BEGIN
  -- Find the Outbound Funnel pipeline ID (it might have different names)
  SELECT id INTO outbound_funnel_id
  FROM pipelines
  WHERE name ILIKE '%outbound%' OR name ILIKE '%sales%' OR name ILIKE '%funnel%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Find the Client Success pipeline ID
  SELECT id INTO client_success_id
  FROM pipelines
  WHERE name ILIKE '%client%success%' OR name ILIKE '%client%'
  ORDER BY created_at
  LIMIT 1;
  
  -- Show what we found
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FOUND PIPELINES';
  RAISE NOTICE '========================================';
  
  IF outbound_funnel_id IS NOT NULL THEN
    RAISE NOTICE '✅ Outbound/Sales Pipeline ID: %', outbound_funnel_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Outbound/Sales pipeline!';
  END IF;
  
  IF client_success_id IS NOT NULL THEN
    RAISE NOTICE '✅ Client Success Pipeline ID: %', client_success_id;
  ELSE
    RAISE WARNING '⚠️  Could not find Client Success pipeline!';
  END IF;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Only proceed if we found at least the outbound pipeline
  IF outbound_funnel_id IS NULL THEN
    RAISE EXCEPTION 'Cannot proceed: No sales/outbound pipeline found. Please create pipelines first.';
  END IF;
  
  -- Fix "uncontacted" deals (assign to outbound pipeline)
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE stage = 'uncontacted'
    AND (pipeline_id IS NULL OR pipeline_id != outbound_funnel_id);
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % "uncontacted" deals to Outbound pipeline', deals_updated;
  
  -- Fix other Outbound Funnel stages
  UPDATE deals
  SET pipeline_id = outbound_funnel_id
  WHERE pipeline_id IS NULL
    AND stage IN (
      'no answer / gatekeeper',
      'dm connected',
      'discovery',
      'strategy call booked',
      'strategy call attended',
      'bizops audit agreement sent',
      'bizops audit paid / booked',
      'bizops audit attended',
      'ms agreement sent',
      'balance paid / deal won',
      'not interested',
      'not qualified',
      'not contacted',
      'decision maker',
      'nurturing',
      'interested',
      'proposal / scope',
      'closed won',
      'closed lost'
    );
  
  GET DIAGNOSTICS deals_updated = ROW_COUNT;
  RAISE NOTICE '✅ Updated % other Outbound stages', deals_updated;
  
  -- Fix Client Success stages (if we found that pipeline)
  IF client_success_id IS NOT NULL THEN
    UPDATE deals
    SET pipeline_id = client_success_id
    WHERE pipeline_id IS NULL
      AND stage IN (
        'onboarding call booked',
        'onboarding call attended',
        'active client (operator)',
        'active client - project in progress',
        'paused client',
        'candidate replacement',
        'project rescope / expansion',
        'active client - project maintenance',
        'cancelled / completed'
      );
    
    GET DIAGNOSTICS deals_updated = ROW_COUNT;
    RAISE NOTICE '✅ Updated % Client Success stages', deals_updated;
  END IF;
  
  -- Show final summary
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '   FINAL SUMMARY';
  RAISE NOTICE '========================================';
  
  -- Count "uncontacted" deals now
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted' AND pipeline_id = outbound_funnel_id;
  
  RAISE NOTICE '"uncontacted" deals in Outbound: %', deals_updated;
  
  -- Count total "uncontacted"
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE stage = 'uncontacted';
  
  RAISE NOTICE 'Total "uncontacted" deals: %', deals_updated;
  
  -- Check for any remaining NULL pipeline_ids
  SELECT COUNT(*) INTO deals_updated
  FROM deals
  WHERE pipeline_id IS NULL;
  
  IF deals_updated > 0 THEN
    RAISE WARNING '⚠️  Still have % deals with NULL pipeline_id', deals_updated;
    RAISE NOTICE 'Stages with NULL pipeline_id:';
    
    FOR r IN (
      SELECT stage, COUNT(*) as count 
      FROM deals 
      WHERE pipeline_id IS NULL 
      GROUP BY stage 
      ORDER BY count DESC 
      LIMIT 10
    )
    LOOP
      RAISE NOTICE '   • "%": % deals', r.stage, r.count;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ All deals now have a pipeline_id!';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;



