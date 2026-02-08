-- Published problems gallery
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

-- Upvotes tracking (one per user per problem)
create table gallery_upvotes (
  user_id uuid references auth.users(id),
  problem_id text references gallery_problems(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, problem_id)
);

alter table gallery_problems enable row level security;
alter table gallery_upvotes enable row level security;

-- Anyone can read gallery
create policy "Gallery is publicly readable" on gallery_problems for select using (true);
-- Authors can manage their own
create policy "Authors manage own problems" on gallery_problems for all using (auth.uid() = user_id);
-- Anyone authenticated can upvote
create policy "Authenticated users can upvote" on gallery_upvotes for all using (auth.uid() = user_id);
