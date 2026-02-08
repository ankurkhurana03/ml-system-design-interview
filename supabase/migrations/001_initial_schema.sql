-- Store user LLM settings
create table user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  llm_base_url text default 'https://api.openai.com/v1',
  llm_api_key_encrypted text,
  llm_model text default 'gpt-4o',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- User's private/draft problems
create table user_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  yaml_content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row-level security
alter table user_settings enable row level security;
create policy "Users manage own settings"
  on user_settings for all using (auth.uid() = user_id);

alter table user_drafts enable row level security;
create policy "Users manage own drafts"
  on user_drafts for all using (auth.uid() = user_id);
