import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AI_FRIEND_ID } from "@/services/supabase";
import { useToast } from "@/hooks/use-toast";

// Component to setup AI friend for new users
export const useAIFriendSetup = () => {
  const { toast } = useToast();

  useEffect(() => {
    const setupAIFriend = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        // Check if friendship with AI already exists
        const { data: existingFriendship } = await supabase
          .from('friendships')
          .select('*')
          .or(`user1_id.eq.${session.user.id},user2_id.eq.${session.user.id}`)
          .or(`user1_id.eq.${AI_FRIEND_ID},user2_id.eq.${AI_FRIEND_ID}`)
          .maybeSingle();

        if (!existingFriendship) {
          // Create friendship with AI
          const { error } = await supabase
            .from('friendships')
            .insert({
              user1_id: session.user.id,
              user2_id: AI_FRIEND_ID
            });

          if (error) {
            console.error("Error creating AI friendship:", error);
          }
        }
      } catch (error) {
        console.error("Error in AI friend setup:", error);
      }
    };

    setupAIFriend();
  }, []);
};

const AIFriendSetup = () => {
  useAIFriendSetup();
  return null;
};

export default AIFriendSetup;
