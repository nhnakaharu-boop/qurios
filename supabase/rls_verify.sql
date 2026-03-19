-- ============================================================
-- RLS VERIFICATION QUERY
-- Run in Supabase SQL Editor to confirm all tables have RLS
-- ============================================================

SELECT
  t.tablename,
  CASE WHEN c.relrowsecurity THEN '✅ RLS ON' ELSE '❌ RLS OFF' END AS rls_status,
  COUNT(pol.polname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_class c
  ON c.relname = t.tablename
  AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LEFT JOIN pg_policy pol
  ON pol.polrelid = c.oid
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
GROUP BY t.tablename, c.relrowsecurity
ORDER BY rls_status, t.tablename;

-- Expected: ALL tables should show ✅ RLS ON
-- If any show ❌ RLS OFF, run:
-- ALTER TABLE public.<tablename> ENABLE ROW LEVEL SECURITY;
