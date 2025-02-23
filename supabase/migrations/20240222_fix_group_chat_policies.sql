-- Drop existing problematic policies
DROP POLICY IF EXISTS "View chat members" ON chat_members;
DROP POLICY IF EXISTS "Join chats" ON chat_members;
DROP POLICY IF EXISTS "View chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "View typing indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Manage typing status" ON typing_indicators;

-- Create new policies for chat_members
CREATE POLICY "View chat members"
ON chat_members FOR SELECT
USING (
    user_id = auth.uid()
    OR
    EXISTS (
        SELECT 1 FROM chat_members cm
        WHERE cm.chat_id = chat_members.chat_id
        AND cm.user_id = auth.uid()
    )
);

CREATE POLICY "Join chats"
ON chat_members FOR INSERT
WITH CHECK (
    -- Allow users to join if they're being added by the group creator
    EXISTS (
        SELECT 1 FROM chats
        WHERE id = chat_id
        AND created_by = auth.uid()
    )
    OR
    -- Allow users to join if they're being added as themselves
    (user_id = auth.uid())
);

-- Create new policies for chats
CREATE POLICY "View chats"
ON chats FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM chat_members
        WHERE chat_id = id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Create chats"
ON chats FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Fix typing indicators policies
CREATE POLICY "View typing indicators"
ON typing_indicators FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM chat_members
        WHERE chat_id = typing_indicators.chat_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Manage typing status"
ON typing_indicators FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create a function for group chat creation
CREATE OR REPLACE FUNCTION create_group_chat(
    group_name text,
    member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_chat_id uuid;
BEGIN
    -- Create the group chat
    INSERT INTO chats (name, is_group, created_by)
    VALUES (group_name, true, auth.uid())
    RETURNING id INTO new_chat_id;

    -- Add the creator as admin
    INSERT INTO chat_members (chat_id, user_id, role)
    VALUES (new_chat_id, auth.uid(), 'admin');

    -- Add other members
    INSERT INTO chat_members (chat_id, user_id, role)
    SELECT new_chat_id, 
           unnest,
           'member'
    FROM unnest(member_ids)
    WHERE unnest != auth.uid();

    RETURN new_chat_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_group_chat TO authenticated; 