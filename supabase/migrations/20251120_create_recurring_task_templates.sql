-- ✨ Create recurring_task_templates table
CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  description TEXT NOT NULL,
  default_client TEXT,
  default_task_type TEXT,
  default_categories TEXT[],
  default_priority TEXT,
  auto_queue_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_templates_user_id ON public.recurring_task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_created_at ON public.recurring_task_templates(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.recurring_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own templates
CREATE POLICY "Users can insert their own templates"
  ON public.recurring_task_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own templates"
  ON public.recurring_task_templates
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.recurring_task_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.recurring_task_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.recurring_task_templates TO authenticated;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_templates_updated_at
  BEFORE UPDATE ON public.recurring_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_templates_updated_at();


