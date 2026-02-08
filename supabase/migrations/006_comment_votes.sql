-- Comment voting system
create table comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references node_comments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  vote_type smallint not null check (vote_type in (1, -1)),
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

-- Index for fast lookups
create index idx_comment_votes_comment on comment_votes(comment_id);
create index idx_comment_votes_user on comment_votes(user_id);

-- RLS: anyone can read votes, users can manage their own votes
alter table comment_votes enable row level security;

create policy "Votes are publicly readable"
  on comment_votes for select
  using (true);

create policy "Users manage own votes"
  on comment_votes for all
  using (auth.uid() = user_id);

-- Add vote_score column to node_comments for fast reads
alter table node_comments add column vote_score integer default 0;

-- Create function to update vote_score
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

-- Trigger to automatically update vote_score
create trigger comment_vote_score_trigger
  after insert or update or delete on comment_votes
  for each row
  execute function update_comment_vote_score();
