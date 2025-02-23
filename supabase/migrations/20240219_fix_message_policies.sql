-- Drop ALL existing message policies
drop policy if exists "View messages" on messages;
drop policy if exists "Send messages" on messages;
drop policy if exists "Edit own messages" on messages;
drop policy if exists "Delete own messages" on messages;
drop policy if exists "Users can view messages in their chats" on messages;
drop policy if exists "Users can send messages to their chats" on messages;
drop policy if exists "Users can edit their own messages" on messages;

-- Create new message policies
create policy "View messages"
    on messages for select
    using (
        exists (
            select 1 from chat_members
            where chat_id = messages.chat_id
            and user_id = auth.uid()
        )
    );

create policy "Send messages"
    on messages for insert
    with check (
        auth.role() = 'authenticated'
        and exists (
            select 1 from chat_members
            where chat_id = messages.chat_id
            and user_id = auth.uid()
        )
    );

create policy "Edit own messages"
    on messages for update
    using (
        auth.uid() = sender_id
        and auth.role() = 'authenticated'
    );

create policy "Delete own messages"
    on messages for delete
    using (
        auth.uid() = sender_id
        and auth.role() = 'authenticated'
    );

-- Enable RLS
alter table messages enable row level security;

-- Drop existing publication
drop publication if exists supabase_realtime;

-- Create new publication for all tables
create publication supabase_realtime for all tables; 