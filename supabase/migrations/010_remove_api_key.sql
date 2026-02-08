-- Remove API key storage from the database.
-- Keys are now stored client-side only (sessionStorage/localStorage)
-- and passed per-request to Edge Functions.
--
-- This migration is safe to run even if the column has data —
-- existing keys will be lost from the DB, which is the desired behavior.

ALTER TABLE user_settings DROP COLUMN IF EXISTS llm_api_key_encrypted;
