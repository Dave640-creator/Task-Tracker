-- Run this ONCE in Supabase: SQL Editor > New query > paste > Run.

create table if not exists users (
  id            integer generated always as identity primary key,
  name          text not null,
  email         text not null unique,
  password      text not null,
  reset_token   text,
  reset_expires bigint
);

create table if not exists tasks (
  id            integer generated always as identity primary key,
  user_id       integer not null references users(id) on delete cascade,
  title         text not null,
  priority      text not null default 'medium',
  category      text not null default 'School',
  due           text not null default '',
  status        text not null default 'todo',
  position      integer not null default 0,
  completed_at  text,
  notes         text not null default '',
  tags          text not null default '',
  repeat_every  text not null default 'none'
);

create table if not exists subtasks (
  id      integer generated always as identity primary key,
  task_id integer not null references tasks(id) on delete cascade,
  title   text not null,
  done    boolean not null default false
);

create table if not exists task_members (
  task_id integer not null references tasks(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  primary key (task_id, user_id)
);

-- The file itself lives in Supabase Storage (bucket "attachments"). Here we keep its info.
create table if not exists attachments (
  id            integer generated always as identity primary key,
  task_id       integer not null references tasks(id) on delete cascade,
  original_name text not null,
  stored_name   text not null,
  size          integer not null,
  uploaded_by   integer not null
);

create table if not exists activity (
  id         integer generated always as identity primary key,
  task_id    integer not null references tasks(id) on delete cascade,
  user_id    integer not null references users(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create table if not exists focus_sessions (
  id      integer generated always as identity primary key,
  user_id integer not null references users(id) on delete cascade,
  task_id integer references tasks(id) on delete set null,
  minutes integer not null,
  day     text not null
);

create index if not exists tasks_user_idx       on tasks(user_id);
create index if not exists subtasks_task_idx    on subtasks(task_id);
create index if not exists members_user_idx     on task_members(user_id);
create index if not exists attachments_task_idx on attachments(task_id);
create index if not exists activity_task_idx    on activity(task_id);
create index if not exists focus_user_idx       on focus_sessions(user_id);

-- Security: the server connects with a direct Postgres login, which is not affected by RLS.
-- Turning RLS on (with no policies) blocks Supabase's public API, so nobody can read
-- these tables with the anon key.
alter table users          enable row level security;
alter table tasks          enable row level security;
alter table subtasks       enable row level security;
alter table task_members   enable row level security;
alter table attachments    enable row level security;
alter table activity       enable row level security;
alter table focus_sessions enable row level security;

-- Private bucket for uploaded files (5 MB limit is also enforced in the server).
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 4194304)
on conflict (id) do nothing;
