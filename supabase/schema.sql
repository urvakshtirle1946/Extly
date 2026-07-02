-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Create projects table
create table if not exists public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    status text not null default 'idle',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Create files table
create table if not exists public.files (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    path text not null,
    content text not null,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint files_project_id_path_key unique (project_id, path)
);

-- Create generations table
create table if not exists public.generations (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    prompt text not null,
    files_snapshot jsonb not null,
    input_tokens integer,
    output_tokens integer,
    created_at timestamp with time zone not null default now()
);

-- Create messages table
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamp with time zone not null default now()
);

-- Enable RLS on all tables
alter table public.projects enable row level security;
alter table public.files enable row level security;
alter table public.generations enable row level security;
alter table public.messages enable row level security;

-- Create RLS Policies

-- Projects: Users can only access their own projects
create policy "Users can perform all actions on their own projects"
    on public.projects
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Files: Users can only access files of their own projects
create policy "Users can perform all actions on files of their own projects"
    on public.files
    for all
    using (
        exists (
            select 1 from public.projects
            where public.projects.id = public.files.project_id
            and public.projects.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.projects
            where public.projects.id = public.files.project_id
            and public.projects.user_id = auth.uid()
        )
    );

-- Generations: Users can only access generations of their own projects
create policy "Users can perform all actions on generations of their own projects"
    on public.generations
    for all
    using (
        exists (
            select 1 from public.projects
            where public.projects.id = public.generations.project_id
            and public.projects.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.projects
            where public.projects.id = public.generations.project_id
            and public.projects.user_id = auth.uid()
        )
    );

-- Messages: Users can only access messages of their own projects
create policy "Users can perform all actions on messages of their own projects"
    on public.messages
    for all
    using (
        exists (
            select 1 from public.projects
            where public.projects.id = public.messages.project_id
            and public.projects.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.projects
            where public.projects.id = public.messages.project_id
            and public.projects.user_id = auth.uid()
        )
    );
