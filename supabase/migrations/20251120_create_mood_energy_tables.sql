-- Create mood_entries table
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mood TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create energy_entries table
CREATE TABLE IF NOT EXISTS public.energy_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  energy_level TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_timestamp ON public.mood_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_energy_entries_user_timestamp ON public.energy_entries(user_id, timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.energy_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mood_entries
DROP POLICY IF EXISTS "Users can insert their own mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Users can view their own mood entries" ON public.mood_entries;
DROP POLICY IF EXISTS "Admins can view all mood entries" ON public.mood_entries;

CREATE POLICY "Users can insert their own mood entries"
  ON public.mood_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own mood entries"
  ON public.mood_entries
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for energy_entries
DROP POLICY IF EXISTS "Users can insert their own energy entries" ON public.energy_entries;
DROP POLICY IF EXISTS "Users can view their own energy entries" ON public.energy_entries;
DROP POLICY IF EXISTS "Admins can view all energy entries" ON public.energy_entries;

CREATE POLICY "Users can insert their own energy entries"
  ON public.energy_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own energy entries"
  ON public.energy_entries
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.mood_entries TO authenticated;
GRANT ALL ON public.energy_entries TO authenticated;

