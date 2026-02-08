-- Comments/suggestions on individual nodes
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

-- Index for fast lookups by problem + node
create index idx_node_comments_lookup on node_comments(problem_id, node_id);
create index idx_node_comments_status on node_comments(status);
create index idx_node_comments_parent on node_comments(parent_id);

-- RLS: anyone can read approved comments, only authors can manage their own
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
