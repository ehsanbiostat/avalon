-- Debug the 406 error by checking table structure and data

-- 1. Check if the room_players table exists and its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'room_players' 
ORDER BY ordinal_position;

-- 2. Check if the specific room exists
SELECT id, code, status, host_id, current_players 
FROM public.game_rooms 
WHERE id = '5c80e1e3-8944-4add-83ab-b4daad027205';

-- 3. Check if there are any players in room_players table
SELECT COUNT(*) as total_players FROM public.room_players;

-- 4. Check if the specific player exists in any room
SELECT * FROM public.room_players 
WHERE player_id = 'b8b24af9-9463-4af8-ab83-ce3960567e4e';

-- 5. Test a simple query on room_players
SELECT * FROM public.room_players LIMIT 5;

-- 6. Check if there are any constraints or triggers
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'room_players';

-- 7. Check if the table has the right permissions
SELECT 
    grantee, 
    privilege_type, 
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'room_players';
