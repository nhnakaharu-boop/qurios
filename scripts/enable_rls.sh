#!/bin/bash
# Enable RLS on all Qurios tables via Supabase CLI or psql
# Usage: DATABASE_URL=postgres://... ./scripts/enable_rls.sh

set -euo pipefail
TABLES=(profiles follows friendships groups group_members lessons lesson_photos challenges challenge_answers challenge_likes challenge_comments lesson_requests earnings payouts rankings notifications audit_logs endless_sessions achievements user_achievements study_streaks memberships membership_subscriptions membership_posts reports payments)
echo "Enabling RLS on ${#TABLES[@]} tables..."
for table in "${TABLES[@]}"; do
  SQL="ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;"
  if command -v supabase &>/dev/null; then
    supabase db query "$SQL" && echo "  ✅ ${table}" || echo "  ❌ ${table}"
  elif [ -n "${DATABASE_URL:-}" ]; then
    psql "$DATABASE_URL" -c "$SQL" && echo "  ✅ ${table}" || echo "  ❌ ${table}"
  else
    echo "  ℹ️  Manual: $SQL"
  fi
done
echo "Done."
