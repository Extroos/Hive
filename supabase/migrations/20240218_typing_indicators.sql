-- Create typing_indicators table
create table public.typing_indicators (
    chat_id uuid references public.chats(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    updated_at timestamp with time zone default now(),
    primary key (chat_id, user_id)
);

-- Enable RLS
alter table public.typing_indicators enable row level security;

-- Typing indicators policies
create policy "Users can view typing indicators in their chats"
    on public.typing_indicators for select
    using (
        exists (
            select 1 from public.chat_members
            where chat_id = typing_indicators.chat_id
            and user_id = auth.uid()
        )
    );

create policy "Users can update their typing status"
    on public.typing_indicators for insert
    with check (auth.uid() = user_id);

create policy "Users can update their typing status"
    on public.typing_indicators for update
    using (auth.uid() = user_id);

create policy "Users can delete their typing status"
    on public.typing_indicators for delete
    using (auth.uid() = user_id);

-- Function to update typing status
create or replace function public.update_typing_status(chat_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    insert into public.typing_indicators (chat_id, user_id)
    values (chat_id, auth.uid())
    on conflict (chat_id, user_id)
    do update set updated_at = now();
end;
$$; 