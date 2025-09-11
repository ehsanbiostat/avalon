-- Check current RLS policies on room_players table
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'room_players' 
ORDER BY policyname;

-- Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'room_players';

-- Check if the table exists and has the right structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'room_players' 
ORDER BY ordinal_position;
