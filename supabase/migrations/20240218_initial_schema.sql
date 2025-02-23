-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create users table
create table public.profiles (
    id uuid references auth.users on delete cascade,
    username text unique,
    email text unique,
    avatar_url text,
    status text default 'offline',
    last_seen timestamp with time zone default now(),
    created_at timestamp with time zone default now(),
    primary key (id)
);

-- Create chats table for both one-on-one and group chats
create table public.chats (
    id uuid default uuid_generate_v4() primary key,
    name text, -- null for one-on-one chats
    is_group boolean default false,
    created_at timestamp with time zone default now(),
    created_by uuid references public.profiles(id)
);

-- Create chat members table
create table public.chat_members (
    chat_id uuid references public.chats(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    role text default 'member', -- 'admin' for group chat admins
    joined_at timestamp with time zone default now(),
    primary key (chat_id, user_id)
);

-- Create messages table
create table public.messages (
    id uuid default uuid_generate_v4() primary key,
    chat_id uuid references public.chats(id) on delete cascade,
    sender_id uuid references public.profiles(id) on delete cascade,
    content text,
    type text default 'text', -- 'text', 'image', 'video', 'document'
    file_url text, -- for media messages
    is_edited boolean default false,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create message reactions table
create table public.message_reactions (
    message_id uuid references public.messages(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    reaction text not null,
    created_at timestamp with time zone default now(),
    primary key (message_id, user_id)
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.chats enable row level security;
alter table public.chat_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;

-- Profiles security policies
create policy "Public profiles are viewable by everyone"
    on public.profiles for select
    using (true);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Chats security policies
create policy "Users can view chats they are members of"
    on public.chats for select
    using (
        exists (
            select 1 from public.chat_members
            where chat_id = id and user_id = auth.uid()
        )
    );

create policy "Users can create chats"
    on public.chats for insert
    with check (auth.uid() = created_by);

-- Chat members security policies
create policy "Users can view chat members of their chats"
    on public.chat_members for select
    using (
        exists (
            select 1 from public.chat_members
            where chat_id = chat_members.chat_id and user_id = auth.uid()
        )
    );

create policy "Users can join chats they're invited to"
    on public.chat_members for insert
    with check (
        auth.uid() = user_id
    );

-- Messages security policies
create policy "Users can view messages in their chats"
    on public.messages for select
    using (
        exists (
            select 1 from public.chat_members
            where chat_id = messages.chat_id and user_id = auth.uid()
        )
    );

create policy "Users can send messages to their chats"
    on public.messages for insert
    with check (
        auth.uid() = sender_id and
        exists (
            select 1 from public.chat_members
            where chat_id = messages.chat_id and user_id = auth.uid()
        )
    );

create policy "Users can edit their own messages"
    on public.messages for update
    using (auth.uid() = sender_id);

-- Message reactions security policies
create policy "Users can view reactions in their chats"
    on public.message_reactions for select
    using (
        exists (
            select 1 from public.chat_members cm
            join public.messages m on m.chat_id = cm.chat_id
            where m.id = message_id and cm.user_id = auth.uid()
        )
    );

create policy "Users can react to messages in their chats"
    on public.message_reactions for insert
    with check (
        auth.uid() = user_id and
        exists (
            select 1 from public.chat_members cm
            join public.messages m on m.chat_id = cm.chat_id
            where m.id = message_id and cm.user_id = auth.uid()
        )
    );

-- Functions
create or replace function public.create_one_on_one_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer
as $$
declare
    new_chat_id uuid;
begin
    -- Check if chat already exists
    select c.id into new_chat_id
    from public.chats c
    join public.chat_members cm1 on cm1.chat_id = c.id
    join public.chat_members cm2 on cm2.chat_id = c.id
    where not c.is_group
    and cm1.user_id = auth.uid()
    and cm2.user_id = other_user_id;

    -- If chat doesn't exist, create it
    if new_chat_id is null then
        insert into public.chats (is_group, created_by)
        values (false, auth.uid())
        returning id into new_chat_id;

        insert into public.chat_members (chat_id, user_id)
        values
            (new_chat_id, auth.uid()),
            (new_chat_id, other_user_id);
    end if;

    return new_chat_id;
end;
$$; 