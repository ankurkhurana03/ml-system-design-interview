-- Moderation configuration
create table moderation_config (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'manual' check (mode in ('full_auto', 'ai_assisted', 'manual')),
  rules jsonb not null default '[]',
  auto_respond_questions boolean default false,
  confidence_threshold numeric default 0.8,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);

-- Only admins can manage config
alter table moderation_config enable row level security;
create policy "Admins manage moderation config" on moderation_config for all using (
  auth.uid() in (select user_id from admin_users)
);
create policy "Anyone can read config" on moderation_config for select using (true);

-- Insert default config
insert into moderation_config (mode, rules) values ('manual', '[
  {"name": "Reject spam", "description": "Reject obvious spam, promotional content, or irrelevant links", "enabled": true},
  {"name": "Approve ML-related", "description": "Approve questions and suggestions related to ML system design", "enabled": true},
  {"name": "Flag uncertain", "description": "Flag content that is borderline or ambiguous for human review", "enabled": true},
  {"name": "Reject offensive", "description": "Reject offensive, abusive, or hateful content", "enabled": true},
  {"name": "Auto-answer questions", "description": "Automatically generate answers for ML-related questions", "enabled": true}
]');
