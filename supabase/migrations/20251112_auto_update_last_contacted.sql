-- Auto-update last_contacted_at for contacts when calls or emails are logged
-- This ensures the contact's last_contacted_at field is always current

-- Function to update contact's last_contacted_at
CREATE OR REPLACE FUNCTION update_contact_last_contacted()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contact's last_contacted_at if the call/email has a related contact
  IF NEW.related_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_contacted_at = COALESCE(NEW.call_timestamp, NEW.sent_at, NOW())
    WHERE id = NEW.related_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for calls table
CREATE TRIGGER trigger_update_contact_last_contacted_calls
AFTER INSERT ON calls
FOR EACH ROW
EXECUTE FUNCTION update_contact_last_contacted();

-- Trigger for emails table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emails') THEN
    CREATE TRIGGER trigger_update_contact_last_contacted_emails
    AFTER INSERT ON emails
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_last_contacted();
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION update_contact_last_contacted() IS 'Automatically updates contact last_contacted_at when a call or email is logged';

