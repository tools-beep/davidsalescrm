-- Fix the update_contact_last_contacted function to handle calls and emails separately
-- The issue was that it tried to access NEW.sent_at on the calls table, which doesn't have that field

-- Drop the old shared function and triggers
DROP TRIGGER IF EXISTS trigger_update_contact_last_contacted_calls ON calls;
DROP TRIGGER IF EXISTS trigger_update_contact_last_contacted_emails ON emails;
DROP FUNCTION IF EXISTS update_contact_last_contacted();

-- Create separate function for calls
CREATE OR REPLACE FUNCTION update_contact_last_contacted_from_call()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contact's last_contacted_at if the call has a related contact
  IF NEW.related_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_contacted_at = COALESCE(NEW.call_timestamp, NOW())
    WHERE id = NEW.related_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create separate function for emails
CREATE OR REPLACE FUNCTION update_contact_last_contacted_from_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contact's last_contacted_at if the email has a related contact
  IF NEW.related_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_contacted_at = COALESCE(NEW.sent_at, NOW())
    WHERE id = NEW.related_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calls table
CREATE TRIGGER trigger_update_contact_last_contacted_calls
AFTER INSERT ON calls
FOR EACH ROW
EXECUTE FUNCTION update_contact_last_contacted_from_call();

-- Create trigger for emails table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emails') THEN
    CREATE TRIGGER trigger_update_contact_last_contacted_emails
    AFTER INSERT ON emails
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_last_contacted_from_email();
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION update_contact_last_contacted_from_call() IS 'Automatically updates contact last_contacted_at when a call is logged';
COMMENT ON FUNCTION update_contact_last_contacted_from_email() IS 'Automatically updates contact last_contacted_at when an email is logged';

