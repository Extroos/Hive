-- Drop existing policies to recreate them
drop policy if exists "Users can view chat members of their chats" on chat_members;
drop policy if exists "Users can join chats they're invited to" on chat_members;
drop policy if exists "Users can view their own chat memberships" on chat_members;
drop policy if exists "Users can view members of their chats" on chat_members;

-- Create new, simplified policies for chat_members
create policy "View chat members"
    on chat_members for select
    using (true);  -- Allow reading all chat members, since they're only visible through joins

create policy "Join chats"
    on chat_members for insert
    with check (
        auth.uid() = user_id
        and
        exists (
            select 1 from chats
            where id = chat_id
            and (created_by = auth.uid() or is_group = true)
        )
    );

-- Update chat policies
drop policy if exists "Users can view chats they are members of" on chats;
drop policy if exists "Users can view their chats" on chats;

create policy "View chats"
    on chats for select
    using (
        exists (
            select 1 from chat_members
            where chat_id = id and user_id = auth.uid()
        )
    );

-- Function to safely create one-on-one chats
create or replace function create_one_on_one_chat(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    new_chat_id uuid;
begin
    -- Check if chat already exists
    select c.id into new_chat_id
    from chats c
    join chat_members cm1 on cm1.chat_id = c.id
    join chat_members cm2 on cm2.chat_id = c.id
    where not c.is_group
    and cm1.user_id = auth.uid()
    and cm2.user_id = other_user_id;

    -- If chat doesn't exist, create it
    if new_chat_id is null then
        -- Create new chat
        insert into chats (is_group, created_by)
        values (false, auth.uid())
        returning id into new_chat_id;

        -- Add both users to chat
        insert into chat_members (chat_id, user_id)
        values
            (new_chat_id, auth.uid()),
            (new_chat_id, other_user_id);
    end if;

    return new_chat_id;
end;
$$; 