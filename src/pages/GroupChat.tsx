import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/services/supabase";
import { getGroupMessages, GroupMessage, Group } from "@/services/groupChat";
import { GroupChatWindow } from "@/components/GroupChatWindow";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types/user";

const GroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);

  useEffect(() => {
    const init = async () => {
      const user = await getCurrentUser();
      if (!user) { navigate("/"); return; }
      setCurrentUser(user);

      if (!groupId) return;

      // Fetch group info
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (error || !data) {
        navigate("/home");
        return;
      }
      setGroup(data as any);

      // Subscribe to messages
      const unsub = getGroupMessages(groupId, setMessages);
      return () => { if (unsub) unsub(); };
    };
    init();
  }, [groupId, navigate]);

  if (!currentUser || !group) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex-1 h-full">
        <GroupChatWindow
          group={group}
          messages={messages}
          currentUserId={currentUser.id}
          onBack={() => navigate("/home")}
          onGroupDeleted={() => navigate("/home")}
        />
      </div>
    </div>
  );
};

export default GroupChat;
