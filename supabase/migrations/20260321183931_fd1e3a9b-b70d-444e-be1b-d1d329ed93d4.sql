
-- Groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: user can only be member once per group
ALTER TABLE public.group_members ADD CONSTRAINT unique_group_member UNIQUE (group_id, user_id);

-- Group messages table (separate from 1-on-1 messages for cleaner queries)
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  image_url text,
  audio_url text,
  reply_to uuid REFERENCES public.group_messages(id),
  is_edited boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Groups RLS policies
CREATE POLICY "Members can view their groups" ON public.groups
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creator can update group" ON public.groups
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Group creator can delete group" ON public.groups
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

-- Group members RLS policies
CREATE POLICY "Members can view group members" ON public.group_members
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Group creator or admins can add members" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups WHERE id = group_id AND created_by = auth.uid()
    )
    OR auth.uid() = user_id
  );

CREATE POLICY "Group creator can remove members" ON public.group_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.groups WHERE id = group_id AND created_by = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- Group messages RLS policies
CREATE POLICY "Members can view group messages" ON public.group_messages
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Members can send group messages" ON public.group_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_group_member(auth.uid(), group_id)
  );

CREATE POLICY "Senders can update their messages" ON public.group_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id);

CREATE POLICY "Senders can delete their messages" ON public.group_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Enable realtime for group messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
