import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Send, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Friend } from "./FriendList";
import { VoiceRecorder } from "./VoiceRecorder";
import { useToast } from "@/hooks/use-toast";

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatWindowProps {
  friend: Friend;
  messages: Message[];
  currentUser: string;
  onSendMessage: (message: string) => void;
  onDeleteChat: () => void;
  onDeleteMessage: (messageId: string, deleteForEveryone?: boolean) => void;
  isTyping: boolean;
  onSendVoice?: (audioBlob: Blob) => void;
}

export const ChatWindow = ({ 
  friend, 
  messages, 
  currentUser, 
  onSendMessage,
  onDeleteChat,
  onDeleteMessage,
  isTyping,
  onSendVoice
}: ChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const handleSendVoice = (audioBlob: Blob) => {
    if (onSendVoice) {
      onSendVoice(audioBlob);
    } else {
      toast({
        title: "Voice notes not supported",
        description: "Voice notes are not available for this chat.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage src={friend.avatar} alt={friend.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {friend.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                friend.isOnline ? "bg-status-online" : "bg-status-offline"
              )}
            />
          </div>
          <div>
            <h3 className="font-semibold">{friend.name}</h3>
            <p className="text-xs text-muted-foreground">
              {friend.isOnline ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDeleteChat} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 message-enter",
                message.isOwn ? "justify-end" : "justify-start"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {!message.isOwn && (
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {friend.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <ContextMenu>
                <ContextMenuTrigger>
                  <div className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2 smooth-transition cursor-pointer",
                    message.isOwn 
                      ? "message-sent text-white" 
                      : "bg-chat-received text-chat-received-foreground"
                  )}>
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className={cn(
                      "text-xs mt-1 opacity-70",
                      message.isOwn ? "text-white/70" : "text-muted-foreground"
                    )}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem 
                    onClick={() => onDeleteMessage(message.id, false)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete for me
                  </ContextMenuItem>
                  {message.isOwn && (
                    <ContextMenuItem 
                      onClick={() => onDeleteMessage(message.id, true)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete for everyone
                    </ContextMenuItem>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={friend.avatar} alt={friend.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {friend.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="bg-chat-received text-chat-received-foreground rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-typing rounded-full typing-dots"></div>
                  <div className="w-2 h-2 bg-typing rounded-full typing-dots" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-typing rounded-full typing-dots" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${friend.name}...`}
            className="flex-1 h-10 bg-background border-border focus:ring-primary"
          />
          <VoiceRecorder onSendVoice={handleSendVoice} />
          <Button 
            type="submit" 
            size="sm" 
            className="message-sent border-0 h-10 px-4"
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};