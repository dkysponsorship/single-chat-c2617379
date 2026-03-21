import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Check, X } from "lucide-react";
import { getFriends, getCurrentUser } from "@/services/supabase";
import { createGroup } from "@/services/groupChat";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

interface CreateGroupDialogProps {
  onGroupCreated?: (groupId: string) => void;
}

export const CreateGroupDialog = ({ onGroupCreated }: CreateGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const init = async () => {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUser(user);
        getFriends(user.id, (userFriends) => {
          // Filter out AI assistant
          setFriends(userFriends.filter(f => f.id !== 'ai-assistant'));
        });
      }
    };
    init();
  }, [open]);

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!currentUser || !groupName.trim() || selectedMembers.length === 0) {
      toast({
        title: "Missing info",
        description: "Group name aur kam se kam 1 member select karo.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const group = await createGroup(groupName.trim(), description.trim(), currentUser.id, selectedMembers);
    setLoading(false);

    if (group) {
      toast({ title: "Group created!", description: `${groupName} group ban gaya.` });
      setOpen(false);
      setGroupName("");
      setDescription("");
      setSelectedMembers([]);
      onGroupCreated?.(group.id);
    } else {
      toast({ title: "Error", description: "Group create nahi ho paya.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          New Group
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={50}
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            rows={2}
          />

          <div>
            <p className="text-sm font-medium mb-2">
              Select Members ({selectedMembers.length} selected)
            </p>
            <ScrollArea className="h-56 border rounded-lg p-2">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No friends to add</p>
              ) : (
                <div className="space-y-1">
                  {friends.map((friend) => {
                    const isSelected = selectedMembers.includes(friend.id);
                    return (
                      <div
                        key={friend.id}
                        onClick={() => toggleMember(friend.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-accent"
                        }`}
                      >
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={friend.avatar} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {friend.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{friend.displayName}</p>
                          <p className="text-xs text-muted-foreground">@{friend.username}</p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedMembers.map(id => {
                const f = friends.find(fr => fr.id === id);
                if (!f) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    {f.displayName}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => toggleMember(id)} />
                  </span>
                );
              })}
            </div>
          )}

          <Button onClick={handleCreate} disabled={loading || !groupName.trim() || selectedMembers.length === 0} className="w-full">
            {loading ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
