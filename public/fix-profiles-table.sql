-- Fix profiles table issues
-- Run this in your Supabase SQL Editor

-- 1. Check if profiles table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- 2. Check RLS policies on profiles table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. Temporarily disable RLS to test (DANGER: Only for testing!)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Check if we can insert a test profile (using proper UUID)
INSERT INTO public.profiles (id, username, display_name, avatar)
VALUES (gen_random_uuid(), 'testuser', 'Test User', '🧪')
ON CONFLICT (id) DO NOTHING;

-- 5. Check if the insert worked
SELECT * FROM public.profiles WHERE username = 'testuser';

-- 6. Clean up test data
DELETE FROM public.profiles WHERE username = 'testuser';

-- 7. Re-enable RLS (if you disabled it)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 8. Check current user context
SELECT auth.uid() as current_user_id;

-- 9. Test RLS policy
SELECT * FROM public.profiles WHERE id = auth.uid();
