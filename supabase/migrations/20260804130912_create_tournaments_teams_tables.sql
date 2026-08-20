/*
# Create tournaments and teams tables (single-tenant, no auth)

## Purpose
Migrates TournamentVerse data persistence from localStorage (which has a ~5MB
quota limit that breaks the app after ~20 large tournaments) to Supabase,
which has no such size limit.

## New Tables

### teams
- id (text, primary key) — UUID generated client-side
- data (jsonb, not null) — full Team object serialized as JSON
- created_at (timestamptz) — server timestamp for ordering

### tournaments
- id (text, primary key) — UUID generated client-side
- data (jsonb, not null) — full Tournament object serialized as JSON
- created_at (timestamptz) — server timestamp for ordering

## Security
- Single-tenant app with no sign-in screen.
- RLS enabled on both tables.
- anon + authenticated roles have full CRUD access (data is intentionally
  public/shared, no per-user isolation needed).
- 4 separate policies per table (SELECT/INSERT/UPDATE/DELETE), using
  USING (true) / WITH CHECK (true) which is acceptable for intentionally
  public single-tenant data.

## Notes
1. Each table stores the entire application object (Team or Tournament) as a
   jsonb blob under a `data` column. This preserves the existing data model
   exactly — no normalization, no schema changes to application types.
2. Client-side UUIDs are used as primary keys so the app can generate IDs
   before persistence, preserving the existing create-then-navigate flow.
3. The `created_at` column uses a server default but is also set client-side
   for ordering during the one-time migration import.
*/

CREATE TABLE IF NOT EXISTS teams (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_teams" ON teams;
CREATE POLICY "anon_select_teams" ON teams FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_teams" ON teams;
CREATE POLICY "anon_insert_teams" ON teams FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_teams" ON teams;
CREATE POLICY "anon_update_teams" ON teams FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_teams" ON teams;
CREATE POLICY "anon_delete_teams" ON teams FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS tournaments (
  id text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tournaments" ON tournaments;
CREATE POLICY "anon_select_tournaments" ON tournaments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tournaments" ON tournaments;
CREATE POLICY "anon_insert_tournaments" ON tournaments FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tournaments" ON tournaments;
CREATE POLICY "anon_update_tournaments" ON tournaments FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tournaments" ON tournaments;
CREATE POLICY "anon_delete_tournaments" ON tournaments FOR DELETE
  TO anon, authenticated USING (true);
