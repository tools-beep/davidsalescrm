-- Create table for persisting queue tasks
CREATE TABLE IF NOT EXISTS eod_queue_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT NOT NULL,
    task_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE eod_queue_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own queue tasks
CREATE POLICY "Users can insert their own queue tasks." ON eod_queue_tasks
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own queue tasks." ON eod_queue_tasks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue tasks." ON eod_queue_tasks
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue tasks." ON eod_queue_tasks
FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_eod_queue_tasks_user_client 
ON eod_queue_tasks(user_id, client_name);

-- Set up trigger for updated_at
CREATE TRIGGER update_eod_queue_tasks_updated_at
BEFORE UPDATE ON eod_queue_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE eod_queue_tasks IS 'Stores queued tasks for DAR users per client';
COMMENT ON COLUMN eod_queue_tasks.user_id IS 'User who created the queue task';
COMMENT ON COLUMN eod_queue_tasks.client_name IS 'Client the task is for';
COMMENT ON COLUMN eod_queue_tasks.task_description IS 'Description of the queued task';

