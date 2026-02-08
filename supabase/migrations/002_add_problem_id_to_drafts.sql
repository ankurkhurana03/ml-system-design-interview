-- Add problem_id column to user_drafts for better tracking
alter table user_drafts add column if not exists problem_id text;

-- Create unique index on user_id + problem_id to prevent duplicate drafts
create unique index if not exists user_drafts_user_problem_idx
  on user_drafts(user_id, problem_id)
  where problem_id is not null;
