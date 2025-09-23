-- Add missing columns to training_sessions table
ALTER TABLE public.training_sessions 
ADD COLUMN recording_url TEXT,
ADD COLUMN notes TEXT;