-- ============================================================
-- ML System Design Interview Tool — All Migrations Combined
-- Run this in Supabase SQL Editor for a fresh project
-- ============================================================

-- 001: Base schema
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  llm_base_url text default 'https://api.openai.com/v1',
  llm_api_key_encrypted text,
  llm_model text default 'gpt-4o',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table user_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  yaml_content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;
create policy "Users manage own settings"
  on user_settings for all using (auth.uid() = user_id);

alter table user_drafts enable row level security;
create policy "Users manage own drafts"
  on user_drafts for all using (auth.uid() = user_id);

-- 002: Add problem_id to drafts
alter table user_drafts add column if not exists problem_id text;
create unique index if not exists user_drafts_user_problem_idx
  on user_drafts(user_id, problem_id)
  where problem_id is not null;

-- 003: Node comments
create table node_comments (
  id uuid primary key default gen_random_uuid(),
  problem_id text not null,
  node_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Anonymous',
  content text not null,
  comment_type text not null default 'suggestion' check (comment_type in ('suggestion', 'question', 'feedback', 'answer')),
  parent_id uuid references node_comments(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'answered', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_node_comments_lookup on node_comments(problem_id, node_id);
create index idx_node_comments_status on node_comments(status);
create index idx_node_comments_parent on node_comments(parent_id);

alter table node_comments enable row level security;

create policy "Anyone can read approved comments"
  on node_comments for select
  using (status in ('approved', 'answered'));

create policy "Authenticated users can insert comments"
  on node_comments for insert
  with check (true);

create policy "Users can update own comments"
  on node_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on node_comments for delete
  using (auth.uid() = user_id);

-- 004: Admin roles
create table admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'moderator' check (role in ('moderator', 'admin')),
  created_at timestamptz default now()
);

alter table admin_users enable row level security;

create policy "Admins can read admin_users"
  on admin_users for select using (
    auth.uid() in (select user_id from admin_users)
  );

create policy "Admins can manage all comments"
  on node_comments for all using (
    auth.uid() in (select user_id from admin_users)
  );

-- 005: Gallery
create table gallery_problems (
  id text primary key,
  user_id uuid references auth.users(id),
  title text not null,
  description text not null,
  yaml_content text not null,
  difficulty text default 'intermediate' check (difficulty in ('beginner', 'intermediate', 'advanced')),
  tags text[] default '{}',
  upvotes integer default 0,
  author_name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table gallery_upvotes (
  user_id uuid references auth.users(id),
  problem_id text references gallery_problems(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, problem_id)
);

alter table gallery_problems enable row level security;
alter table gallery_upvotes enable row level security;

create policy "Gallery is publicly readable" on gallery_problems for select using (true);
create policy "Authors manage own problems" on gallery_problems for all using (auth.uid() = user_id);
create policy "Authenticated users can upvote" on gallery_upvotes for all using (auth.uid() = user_id);

-- 006: Comment votes
create table comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references node_comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vote_type smallint not null check (vote_type in (1, -1)),
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

create index idx_comment_votes_comment on comment_votes(comment_id);
create index idx_comment_votes_user on comment_votes(user_id);

alter table comment_votes enable row level security;

create policy "Votes are publicly readable"
  on comment_votes for select
  using (true);

create policy "Users manage own votes"
  on comment_votes for all
  using (auth.uid() = user_id);

alter table node_comments add column vote_score integer default 0;

create or replace function update_comment_vote_score()
returns trigger as $$
begin
  if TG_OP = 'DELETE' then
    update node_comments
    set vote_score = vote_score - OLD.vote_type
    where id = OLD.comment_id;
    return OLD;
  elsif TG_OP = 'INSERT' then
    update node_comments
    set vote_score = vote_score + NEW.vote_type
    where id = NEW.comment_id;
    return NEW;
  elsif TG_OP = 'UPDATE' then
    update node_comments
    set vote_score = vote_score - OLD.vote_type + NEW.vote_type
    where id = NEW.comment_id;
    return NEW;
  end if;
end;
$$ language plpgsql;

create trigger comment_vote_score_trigger
  after insert or update or delete on comment_votes
  for each row
  execute function update_comment_vote_score();

-- 007: Moderation config
create table moderation_config (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'manual' check (mode in ('full_auto', 'ai_assisted', 'manual')),
  rules jsonb not null default '[]',
  auto_respond_questions boolean default false,
  confidence_threshold numeric default 0.8,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

alter table moderation_config enable row level security;
create policy "Admins manage moderation config" on moderation_config for all using (
  auth.uid() in (select user_id from admin_users)
);
create policy "Anyone can read config" on moderation_config for select using (true);

insert into moderation_config (mode, rules) values ('manual', '[
  {"name": "Reject spam", "description": "Reject obvious spam, promotional content, or irrelevant links", "enabled": true},
  {"name": "Approve ML-related", "description": "Approve questions and suggestions related to ML system design", "enabled": true},
  {"name": "Flag uncertain", "description": "Flag content that is borderline or ambiguous for human review", "enabled": true},
  {"name": "Reject offensive", "description": "Reject offensive, abusive, or hateful content", "enabled": true},
  {"name": "Auto-answer questions", "description": "Automatically generate answers for ML-related questions", "enabled": true}
]');

-- 008: Audit log
create table moderation_audit_log (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references node_comments(id) on delete set null,
  action text not null check (action in ('approved', 'rejected', 'flagged', 'answered', 'deleted')),
  actor_type text not null check (actor_type in ('human', 'ai')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text not null default 'System',
  reason text,
  confidence numeric,
  rules_applied text[],
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table moderation_audit_log enable row level security;

create policy "Admins can read audit log"
  on moderation_audit_log for select using (
    auth.uid() in (select user_id from admin_users)
  );

create policy "System can insert audit log"
  on moderation_audit_log for insert using (true);

create index idx_audit_log_created_at on moderation_audit_log(created_at desc);
create index idx_audit_log_action on moderation_audit_log(action);
create index idx_audit_log_actor_type on moderation_audit_log(actor_type);
create index idx_audit_log_comment_id on moderation_audit_log(comment_id);

-- 009: Generated branches
CREATE TABLE generated_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  choice_label TEXT NOT NULL,
  choice_answer TEXT NOT NULL,
  yaml_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT DEFAULT 'Anonymous',
  moderation_reason TEXT,
  moderation_confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE generated_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved branches"
  ON generated_branches FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authors can read own branches"
  ON generated_branches FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can insert"
  ON generated_branches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admins can read all branches"
  ON generated_branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can update status"
  ON generated_branches FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- 010: Remove API key column (moved to client-side storage)
ALTER TABLE user_settings DROP COLUMN IF EXISTS llm_api_key_encrypted;
