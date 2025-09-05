-- Test RLS policies for profiles table
-- Run this in your Supabase SQL Editor

-- 1. Check if profiles table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- 3. Check all RLS policies on profiles table
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 4. Check current user context (should be null when not authenticated)
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role;

-- 5. Test if we can read from profiles table (should work)
SELECT COUNT(*) as profile_count FROM public.profiles;

-- 6. Test if we can insert (this might fail due to RLS)
-- This will show us the exact error
DO $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar)
    VALUES (gen_random_uuid(), 'testuser', 'Test User', '🧪');
    RAISE NOTICE 'Insert successful';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Insert failed: %', SQLERRM;
END $$;

-- 7. Check if there are any users in auth.users
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- 8. If you want to temporarily disable RLS for testing (DANGER!)
-- Uncomment the next line:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 9. If you disabled RLS, re-enable it after testing:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
