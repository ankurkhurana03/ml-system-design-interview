-- Moderation audit log table
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

-- Indexes for efficient queries
create index idx_audit_log_created_at on moderation_audit_log(created_at desc);
create index idx_audit_log_action on moderation_audit_log(action);
create index idx_audit_log_actor_type on moderation_audit_log(actor_type);
create index idx_audit_log_comment_id on moderation_audit_log(comment_id);
