-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_hours DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by_email TEXT,
    pdf_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoice_items table (detailed task breakdown)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    task_date DATE NOT NULL,
    task_description TEXT NOT NULL,
    hours DECIMAL(10, 2) NOT NULL,
    rate DECIMAL(10, 2),
    amount DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices" ON invoices
FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own invoices
CREATE POLICY "Users can create their own invoices" ON invoices
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own invoices (only if pending)
CREATE POLICY "Users can update their own pending invoices" ON invoices
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all invoices
CREATE POLICY "Admins can view all invoices" ON invoices
FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Admins can update all invoices
CREATE POLICY "Admins can update all invoices" ON invoices
FOR UPDATE USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- RLS Policies for invoice_items
-- Users can view items for their own invoices
CREATE POLICY "Users can view their own invoice items" ON invoice_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
    )
);

-- Users can create items for their own invoices
CREATE POLICY "Users can create their own invoice items" ON invoice_items
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM invoices 
        WHERE invoices.id = invoice_items.invoice_id 
        AND invoices.user_id = auth.uid()
    )
);

-- Admins can view all invoice items
CREATE POLICY "Admins can view all invoice items" ON invoice_items
FOR SELECT USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices(client_email);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    year_month TEXT;
    sequence_num INTEGER;
BEGIN
    -- Format: INV-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Get the next sequence number for this month
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_month || '-%';
    
    -- Generate the invoice number
    new_number := 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_invoice_timestamp ON invoices;
CREATE TRIGGER trigger_update_invoice_timestamp
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_invoice_updated_at();

-- Function to approve invoice (called by webhook)
CREATE OR REPLACE FUNCTION approve_invoice(
    p_invoice_id UUID,
    p_approved_by_email TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE invoices
    SET 
        status = 'approved',
        approved_at = NOW(),
        approved_by_email = p_approved_by_email,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject invoice (called by webhook)
CREATE OR REPLACE FUNCTION reject_invoice(
    p_invoice_id UUID,
    p_rejected_by_email TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE invoices
    SET 
        status = 'rejected',
        approved_by_email = p_rejected_by_email,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification trigger for invoice approval
CREATE OR REPLACE FUNCTION notify_invoice_approved()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_client_name TEXT;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        SELECT first_name || ' ' || last_name INTO v_user_name 
        FROM public.user_profiles 
        WHERE user_id = NEW.user_id;
        
        v_client_name := NEW.client_name;

        PERFORM create_admin_notification(
            'invoice_approved',
            'Invoice Approved: ' || NEW.invoice_number,
            'Invoice for ' || v_client_name || ' by ' || v_user_name || ' has been approved. Total: $' || NEW.total_amount::TEXT,
            NEW.user_id,
            '/admin?tab=invoices'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_invoice_approved ON invoices;
CREATE TRIGGER trigger_notify_invoice_approved
AFTER UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION notify_invoice_approved();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON invoices TO authenticated;
GRANT SELECT, INSERT ON invoice_items TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION approve_invoice(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reject_invoice(UUID, TEXT, TEXT) TO anon, authenticated;

