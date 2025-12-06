-- StudyPal AI - Starter schema
-- Adjust fields and constraints to match your final requirements.

create table if not exists users (
   id            serial primary key,
   name          text not null,
   email         text unique not null,
   password_hash text,
   role          text default 'student',
   created_at    timestamptz default now()
);

create table if not exists password_resets (
   id          serial primary key,
   user_id     integer not null
      references users ( id )
         on delete cascade,
   token_hash  text not null,
   expires_at  timestamptz not null,
   used        boolean default false,
   created_at  timestamptz default now(),
   used_at     timestamptz
);

create index if not exists idx_password_resets_token_hash on password_resets ( token_hash );
create index if not exists idx_password_resets_user_id on password_resets ( user_id );

create table if not exists tasks (
   id              serial primary key,
   user_id         integer not null
      references users ( id )
         on delete cascade,
   title           text not null,
   description     text,
   priority        text default 'medium',
   status          text default 'pending',
   due_date        timestamptz,
   estimated_hours numeric(5,2),
   created_at      timestamptz default now(),
   updated_at      timestamptz default now()
);

create table if not exists task_history (
   id              serial primary key,
   task_id         integer not null
      references tasks ( id )
         on delete cascade,
   previous_status text,
   new_status      text,
   changed_at      timestamptz default now()
);

create table if not exists ai_plans (
   id         serial primary key,
   user_id    integer not null
      references users ( id )
         on delete cascade,
   prompt     text,
   response   jsonb,
   created_at timestamptz default now()
);

create table if not exists user_profiles (
   user_id      integer primary key
      references users ( id )
         on delete cascade,
   full_name    text,
   timezone     text,
   pronouns     text,
   notifications jsonb default '{}'::jsonb,
   updated_at   timestamptz default now()
);

create table if not exists user_integrations (
   user_id        integer primary key
      references users ( id )
         on delete cascade,
   gemini_key     text,
   calendar_key   text,
   sync_calendar  boolean default false,
   auto_push_tasks boolean default true,
   updated_at     timestamptz default now()
);
