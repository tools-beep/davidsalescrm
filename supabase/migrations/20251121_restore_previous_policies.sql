-- Restore Previous Permissive Policies
-- This migration restores the simpler, more permissive access control policies
-- IMPORTANT: Drop policies BEFORE dropping functions to avoid dependency errors

-- ===========================================
-- STEP 1: DROP ALL POLICIES FIRST
-- ===========================================

-- Drop DEALS policies
DROP POLICY IF EXISTS "Admins can manage all deals" ON public.deals;
DROP POLICY IF EXISTS "Managers can view all deals" ON public.deals;
DROP POLICY IF EXISTS "Sales reps can view own deals" ON public.deals;
DROP POLICY IF EXISTS "Sales reps can create deals" ON public.deals;
DROP POLICY IF EXISTS "Sales reps can update own deals" ON public.deals;

-- Drop CONTACTS policies
DROP POLICY IF EXISTS "Admins can manage all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Sales team can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Sales team can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Sales team can update contacts" ON public.contacts;

-- Drop COMPANIES policies
DROP POLICY IF EXISTS "Admins can manage all companies" ON public.companies;
DROP POLICY IF EXISTS "Sales team can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Sales team can create companies" ON public.companies;
DROP POLICY IF EXISTS "Sales team can update companies" ON public.companies;

-- Drop CALLS policies
DROP POLICY IF EXISTS "Admins can manage all calls" ON public.calls;
DROP POLICY IF EXISTS "Sales team can view all calls" ON public.calls;
DROP POLICY IF EXISTS "Users can create own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update own calls" ON public.calls;

-- Drop TASKS policies
DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.tasks;

-- Drop USER_PROFILES policies
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.user_profiles;

-- Drop EOD policies
DROP POLICY IF EXISTS "Users can manage own EOD reports" ON public.eod_reports;
DROP POLICY IF EXISTS "Admins can view all clock-ins" ON public.eod_clock_ins;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.eod_submissions;

-- ===========================================
-- STEP 2: NOW DROP THE HELPER FUNCTIONS
-- ===========================================

DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_manager();
DROP FUNCTION IF EXISTS public.is_sales_rep();

-- ===========================================
-- STEP 3: CREATE NEW PERMISSIVE POLICIES
-- ===========================================

-- DEALS TABLE POLICIES
CREATE POLICY "Users can view all deals" 
  ON public.deals 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create deals" 
  ON public.deals 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update deals" 
  ON public.deals 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete deals" 
  ON public.deals 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- CONTACTS TABLE POLICIES
CREATE POLICY "Users can view all contacts" 
  ON public.contacts 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create contacts" 
  ON public.contacts 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update contacts" 
  ON public.contacts 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete contacts" 
  ON public.contacts 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- COMPANIES TABLE POLICIES
CREATE POLICY "Users can view all companies" 
  ON public.companies 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create companies" 
  ON public.companies 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update companies" 
  ON public.companies 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete companies" 
  ON public.companies 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- CALLS TABLE POLICIES
CREATE POLICY "Users can view all calls" 
  ON public.calls 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create calls" 
  ON public.calls 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update calls" 
  ON public.calls 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

-- TASKS TABLE POLICIES
CREATE POLICY "Users can view all tasks" 
  ON public.tasks 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create tasks" 
  ON public.tasks 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tasks" 
  ON public.tasks 
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete tasks" 
  ON public.tasks 
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- USER_PROFILES TABLE POLICIES
CREATE POLICY "Users can view all profiles" 
  ON public.user_profiles 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" 
  ON public.user_profiles 
  FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "Users can manage profiles" 
  ON public.user_profiles 
  FOR ALL 
  USING (auth.uid() IS NOT NULL);

-- EOD PORTAL TABLE POLICIES
CREATE POLICY "Users can manage own EOD reports" 
  ON public.eod_reports 
  FOR ALL 
  USING (user_id = auth.uid() OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view all clock-ins" 
  ON public.eod_clock_ins 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view all submissions" 
  ON public.eod_submissions 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON DATABASE postgres IS 'Restored permissive policies - all authenticated users can view and manage most data';
