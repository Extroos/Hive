-- Drop existing typing indicators table if it exists
drop table if exists public.typing_indicators cascade;

-- Create typing_indicators table
create table public.typing_indicators (
    chat_id uuid references public.chats(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    updated_at timestamp with time zone default now(),
    primary key (chat_id, user_id)
);

-- Enable RLS
alter table public.typing_indicators enable row level security;

-- Create typing indicator policies
create policy "View typing indicators"
    on public.typing_indicators for select
    using (
        exists (
            select 1 from public.chat_members
            where chat_id = typing_indicators.chat_id
            and user_id = auth.uid()
        )
    );

create policy "Manage typing status"
    on public.typing_indicators for all
    using (
        auth.uid() = user_id
        and exists (
            select 1 from public.chat_members
            where chat_id = typing_indicators.chat_id
            and user_id = auth.uid()
        )
    )
    with check (
        auth.uid() = user_id
        and exists (
            select 1 from public.chat_members
            where chat_id = typing_indicators.chat_id
            and user_id = auth.uid()
        )
    ); 