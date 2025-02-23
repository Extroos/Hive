-- Drop existing problematic policies
DROP POLICY IF EXISTS "View chat members" ON chat_members;
DROP POLICY IF EXISTS "Join chats" ON chat_members;
DROP POLICY IF EXISTS "View chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "View typing indicators" ON typing_indicators;
DROP POLICY IF EXISTS "Manage typing status" ON typing_indicators;
DROP POLICY IF EXISTS "Create chats" ON chats;

-- Create simplified policies for chat_members
CREATE POLICY "View chat members"
ON chat_members FOR SELECT
USING (true);  -- Allow reading all chat members since they will be filtered through joins

CREATE POLICY "Join chats"
ON chat_members FOR INSERT
WITH CHECK (
    auth.uid() = user_id  -- Users can only be added as themselves
    OR 
    EXISTS (  -- Or they are being added by the chat creator
        SELECT 1 FROM chats
        WHERE id = chat_id
        AND created_by = auth.uid()
    )
);

-- Create simplified policies for chats
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

-- Create simplified policies for typing indicators
CREATE POLICY "View typing indicators"
ON typing_indicators FOR SELECT
USING (true);  -- Allow reading all typing indicators since they will be filtered through joins

CREATE POLICY "Manage typing status"
ON typing_indicators FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update typing status"
ON typing_indicators FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Delete typing status"
ON typing_indicators FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON chat_members TO authenticated;
GRANT ALL ON chats TO authenticated;
GRANT ALL ON typing_indicators TO authenticated; 