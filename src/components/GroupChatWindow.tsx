import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Send, ArrowLeft, MoreVertical, Trash2, Users, UserPlus, LogOutIcon, Reply, XCircle, Edit2, Check, X, Phone, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Group, GroupMember, GroupMessage, getGroupMembers, sendGroupMessage, deleteGroupMessage, editGroupMessage, leaveGroup, deleteGroup, addGroupMember } from "@/services/groupChat";
import { getFriends, getCurrentUser } from "@/services/supabase";
import { User } from "@/types/user";
import { useToast } from "@/hooks/use-toast";

interface GroupChatWindowProps {
  group: Group;
  messages: GroupMessage[];
  currentUserId: string;
  onBack: () => void;
  onGroupDeleted?: () => void;
  onStartCall?: (type: "voice" | "video") => void;
}

export const GroupChatWindow = ({
  group,
  messages,
  currentUserId,
  onBack,
  onGroupDeleted,
  onStartCall,
}: GroupChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const isCreator = group.created_by === currentUserId;

  useEffect(() => {
    getGroupMembers(group.id).then(setMembers);
  }, [group.id, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    await sendGroupMessage(group.id, currentUserId, newMessage.trim(), replyingTo?.id);
    setNewMessage("");
    setReplyingTo(null);
  };

  const handleDelete = async (msgId: string) => {
    const ok = await deleteGroupMessage(msgId, currentUserId);
    if (ok) toast({ title: "Message deleted" });
  };

  const handleEdit = async () => {
    if (editingId && editContent.trim()) {
      await editGroupMessage(editingId, editContent.trim());
      setEditingId(null);
      setEditContent("");
    }
  };

  const handleLeave = async () => {
    const ok = await leaveGroup(group.id, currentUserId);
    if (ok) {
      toast({ title: "Group chhod diya" });
      onBack();
    }
  };

  const handleDeleteGroup = async () => {
    const ok = await deleteGroup(group.id);
    if (ok) {
      toast({ title: "Group delete ho gaya" });
      onGroupDeleted?.();
      onBack();
    }
  };

  const handleAddMember = async (userId: string) => {
    const ok = await addGroupMember(group.id, userId);
    if (ok) {
      toast({ title: "Member added!" });
      getGroupMembers(group.id).then(setMembers);
    }
  };

  const loadFriendsForAdd = async () => {
    const user = await getCurrentUser();
    if (user) {
      getFriends(user.id, (userFriends) => {
        const memberIds = members.map(m => m.user_id);
        setFriends(userFriends.filter(f => f.id !== 'ai-assistant' && !memberIds.includes(f.id)));
      });
    }
    setShowAddMember(true);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const getSenderName = (senderId: string) => {
    if (senderId === currentUserId) return "You";
    const member = members.find(m => m.user_id === senderId);
    return member?.profile?.display_name || "Unknown";
  };

  const getSenderAvatar = (senderId: string) => {
    const member = members.find(m => m.user_id === senderId);
    return member?.profile?.avatar_url || undefined;
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-safe border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-6 w-4 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{group.name}</h3>
                  <p className="text-xs text-muted-foreground">{members.length} members</p>
                </div>
              </button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>{group.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {group.description && (
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">Members ({members.length})</h4>
                    {isCreator && (
                      <Button variant="ghost" size="sm" onClick={loadFriendsForAdd}>
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={member.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {(member.profile?.display_name || '??').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {member.profile?.display_name || 'Unknown'}
                            {member.user_id === currentUserId && " (You)"}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.role}</p>
                        </div>
                        {member.profile?.is_online && (
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {showAddMember && friends.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Add Friends</h4>
                    <div className="space-y-1">
                      {friends.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent cursor-pointer" onClick={() => handleAddMember(f.id)}>
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={f.avatar} />
                            <AvatarFallback className="text-xs">{f.displayName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{f.displayName}</span>
                          <UserPlus className="w-3 h-3 ml-auto text-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full text-destructive" onClick={handleLeave}>
                    <LogOutIcon className="w-4 h-4 mr-2" /> Leave Group
                  </Button>
                  {isCreator && (
                    <Button variant="destructive" className="w-full" onClick={handleDeleteGroup}>
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleLeave} className="text-destructive">
              <LogOutIcon className="w-4 h-4 mr-2" /> Leave Group
            </DropdownMenuItem>
            {isCreator && (
              <DropdownMenuItem onClick={handleDeleteGroup} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Delete Group
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-2 overflow-x-hidden" style={{ paddingTop: 'calc(4rem + env(safe-area-inset-top))' }}>
        <div className="space-y-3">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            const repliedMsg = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null;

            return (
              <div key={msg.id} className={cn("flex gap-1.5", isOwn ? "justify-end" : "justify-start")}>
                {!isOwn && (
                  <Avatar className="w-7 h-7 mt-1 flex-shrink-0">
                    <AvatarImage src={getSenderAvatar(msg.sender_id)} />
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getSenderName(msg.sender_id).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[75%] group")}>
                  {/* Sender name for others' messages */}
                  {!isOwn && (
                    <p className="text-[10px] text-muted-foreground ml-1 mb-0.5 font-medium">
                      {getSenderName(msg.sender_id)}
                    </p>
                  )}

                  {/* Reply preview */}
                  {repliedMsg && (
                    <div className={cn("text-xs px-2 py-1 mb-0.5 rounded-t-lg border-l-2 border-primary/50", isOwn ? "bg-white/10" : "bg-muted")}>
                      <span className="font-medium">{getSenderName(repliedMsg.sender_id)}</span>
                      <p className="truncate opacity-70">{repliedMsg.content}</p>
                    </div>
                  )}

                  {editingId === msg.id ? (
                    <div className="flex gap-1">
                      <Input value={editContent} onChange={e => setEditContent(e.target.value)} className="h-8 text-sm" />
                      <Button size="sm" className="h-8 w-8 p-0" onClick={handleEdit}><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "rounded-xl px-3 py-1.5 text-sm relative",
                        isOwn ? "message-sent text-white" : "bg-chat-received text-chat-received-foreground"
                      )}
                      onDoubleClick={() => setReplyingTo(msg)}
                    >
                      {msg.image_url && (
                        <img src={msg.image_url} alt="" className="max-w-full rounded-lg mb-1" />
                      )}
                      <p className="break-words">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {msg.is_edited && <span className="text-[9px] opacity-50">edited</span>}
                        <span className={cn("text-[10px]", isOwn ? "text-white/60" : "text-muted-foreground")}>
                          {formatTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Actions on hover */}
                      <div className="absolute -top-6 right-0 hidden group-hover:flex gap-0.5 bg-card border rounded-md shadow-sm p-0.5">
                        <button onClick={() => setReplyingTo(msg)} className="p-1 hover:bg-accent rounded">
                          <Reply className="w-3 h-3" />
                        </button>
                        {isOwn && (
                          <>
                            <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content); }} className="p-1 hover:bg-accent rounded">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(msg.id)} className="p-1 hover:bg-accent rounded text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply bar */}
      {replyingTo && (
        <div className="px-3 py-2 bg-muted/50 border-t flex items-center gap-2">
          <Reply className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">{getSenderName(replyingTo.sender_id)}</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)}><XCircle className="w-4 h-4" /></button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2 pb-safe">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={!newMessage.trim()} className="h-10 w-10 p-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};
