-- Drop existing problematic policies
DROP POLICY IF EXISTS "View chat members" ON chat_members;
DROP POLICY IF EXISTS "Join chats" ON chat_members;

-- Create new policies for chat_members
CREATE POLICY "View chat members"
ON chat_members FOR SELECT
USING (user_id = auth.uid());  -- Allow users to view their own membership

CREATE POLICY "Join chats"
ON chat_members FOR INSERT
WITH CHECK (
    auth.uid() = user_id  -- Users can only join as themselves
    OR 
    EXISTS (  -- Or they are being added by the chat creator
        SELECT 1 FROM chats
        WHERE id = chat_id
        AND created_by = auth.uid()
    )
);

-- Enable RLS
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON chat_members TO authenticated; 