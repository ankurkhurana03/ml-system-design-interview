-- Admin users table
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

-- Allow admins to manage ALL comments
create policy "Admins can manage all comments"
  on node_comments for all using (
    auth.uid() in (select user_id from admin_users)
  );
