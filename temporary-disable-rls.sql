-- TEMPORARY: Disable RLS on room_players table to test if that's causing the 406 error
-- This is for debugging purposes only

-- Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'room_players';

-- Temporarily disable RLS
ALTER TABLE public.room_players DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'room_players';

-- Test query that was failing
SELECT * FROM public.room_players LIMIT 1;
