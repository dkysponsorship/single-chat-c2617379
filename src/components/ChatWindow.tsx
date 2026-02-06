import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger } from "@/components/ui/context-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Send, MoreVertical, Trash2, Edit2, Check, X, Image as ImageIcon, Link2, Images, Reply, XCircle, Play, Pause, ArrowLeft, LogOut, CheckCheck, SmilePlus } from "lucide-react";
import { MessageReactions, ReactionPicker } from "@/components/MessageReactions";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { ChatProfileDrawer } from "@/components/ChatProfileDrawer";
import { ChatThemeBackground } from "@/components/ChatThemeBackground";
import { useChatTheme } from "@/hooks/useChatTheme";

// Message status helper: single tick = sent, double tick = delivered, double blue tick = read
const MessageStatus = ({ message }: { message: Message }) => {
  if (!message.isOwn) return null;
  
  const isTempMessage = message.id.startsWith('temp-');
  
  if (isTempMessage) {
    // Single tick - message sent but not confirmed
    return <Check className="w-3.5 h-3.5 text-white/50" />;
  }
  
  if (message.readAt) {
    // Double blue tick - message read
    return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
  }
  
  // Double grey tick - message delivered (exists in DB)
  return <CheckCheck className="w-3.5 h-3.5 text-white/50" />;
};
import { cn } from "@/lib/utils";
import { Friend } from "./FriendList";
import { VoiceRecorder } from "./VoiceRecorder";
import { ImageViewer } from "./ImageViewer";
import { useToast } from "@/hooks/use-toast";
export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
  audioUrl?: string;
  imageUrl?: string;
  isEdited?: boolean;
  replyTo?: string;
  repliedMessage?: Message;
  readAt?: Date | null;
}
interface ChatWindowProps {
  friend: Friend;
  messages: Message[];
  currentUser: string;
  chatId: string;
  onSendMessage: (message: string, replyToId?: string) => void;
  onDeleteChat: () => void;
  onDeleteMessage: (messageId: string, deleteForEveryone?: boolean) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  isTyping: boolean;
  onSendVoice?: (audioBlob: Blob) => void;
  onSendImage?: (imageFile: File, caption?: string) => void;
  onBack?: () => void;
  onLogout?: () => void;
  currentUserName?: string;
  onInputChange?: () => void;
}
export const ChatWindow = ({
  friend,
  messages,
  currentUser,
  chatId,
  onSendMessage,
  onDeleteChat,
  onDeleteMessage,
  onEditMessage,
  isTyping,
  onSendVoice,
  onSendImage,
  onBack,
  onLogout,
  currentUserName,
  onInputChange
}: ChatWindowProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [showCaptionInput, setShowCaptionInput] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [swipeStates, setSwipeStates] = useState<{
    [key: string]: {
      startX: number;
      currentX: number;
      isSwiping: boolean;
    };
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRefs = useRef<{
    [key: string]: HTMLAudioElement;
  }>({});
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  
  // Get current user ID from friend's perspective in chatId
  const currentUserId = chatId.split('_').find(id => id !== friend.id) || '';
  const { toggleReaction, getGroupedReactions } = useMessageReactions(chatId, currentUserId);
  
  // Chat theme state
  const { currentTheme, customImageUrl, setTheme, setCustomImage } = useChatTheme(chatId, currentUserId);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage, replyingTo?.id);
      setNewMessage("");
      setReplyingTo(null);
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
        variant: "destructive"
      });
    }
  };
  const startEditingMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.text);
  };
  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditContent("");
  };
  const saveEdit = () => {
    if (editingMessageId && editContent.trim()) {
      onEditMessage(editingMessageId, editContent.trim());
      cancelEditing();
    }
  };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setShowCaptionInput(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleSendImageWithCaption = () => {
    if (selectedImage && onSendImage) {
      onSendImage(selectedImage, imageCaption.trim() || undefined);
      setSelectedImage(null);
      setImageCaption("");
      setShowCaptionInput(false);
    }
  };
  const handleCancelImageSend = () => {
    setSelectedImage(null);
    setImageCaption("");
    setShowCaptionInput(false);
  };
  const startReplyingTo = (message: Message) => {
    setReplyingTo(message);
  };
  const cancelReply = () => {
    setReplyingTo(null);
  };
  const handleAudioClick = (messageId: string, audioUrl: string) => {
    if (!audioRefs.current[messageId]) {
      const audio = new Audio(audioUrl);
      audioRefs.current[messageId] = audio;
      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
    const audio = audioRefs.current[messageId];
    if (playingAudioId === messageId) {
      audio.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any currently playing audio
      Object.keys(audioRefs.current).forEach(id => {
        if (id !== messageId) {
          audioRefs.current[id].pause();
        }
      });
      audio.play();
      setPlayingAudioId(messageId);
    }
  };
  const handleLongPressStart = (messageId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      setLongPressMessageId(messageId);
    }, 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const handleSwipeStart = (messageId: string, clientX: number) => {
    setSwipeStates(prev => ({
      ...prev,
      [messageId]: {
        startX: clientX,
        currentX: clientX,
        isSwiping: true
      }
    }));
  };
  const handleSwipeMove = (messageId: string, clientX: number) => {
    const swipeState = swipeStates[messageId];
    if (swipeState && swipeState.isSwiping) {
      const deltaX = clientX - swipeState.startX;
      // Only allow left swipe (negative delta) and limit to 80px
      const limitedDelta = Math.max(Math.min(deltaX, 0), -80);
      setSwipeStates(prev => ({
        ...prev,
        [messageId]: {
          ...swipeState,
          currentX: swipeState.startX + limitedDelta
        }
      }));
    }
  };
  const handleSwipeEnd = (messageId: string, message: Message) => {
    const swipeState = swipeStates[messageId];
    if (swipeState && swipeState.isSwiping) {
      const deltaX = swipeState.currentX - swipeState.startX;
      // Trigger reply if swiped more than 60px to the left
      if (deltaX < -60) {
        startReplyingTo(message);
      }
      // Reset swipe state
      setSwipeStates(prev => {
        const newStates = {
          ...prev
        };
        delete newStates[messageId];
        return newStates;
      });
    }
  };
  const imageMessages = messages.filter(m => m.imageUrl);
  const renderMessageText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80 inline-flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Link2 className="w-3 h-3" />
            {part.length > 30 ? part.substring(0, 30) + '...' : part}
          </a>;
      }
      return <span key={index}>{part}</span>;
    });
  };
  return <div className="flex flex-col h-full bg-background">
      {/* Chat Header - Fixed */}
      <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between p-4 pt-safe border-b border-border bg-card">
        <div className="flex items-center gap-2">
          {onBack && <Button variant="ghost" size="sm" onClick={onBack} className="h-6 w-4 p-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>}
          <ChatProfileDrawer
            friend={friend}
            currentTheme={currentTheme}
            customImageUrl={customImageUrl}
            onSelectTheme={setTheme}
            onSelectCustomImage={setCustomImage}
          >
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {friend.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background", friend.isOnline ? "bg-[hsl(var(--online-status))]" : "bg-muted")} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">{friend.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {friend.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </button>
          </ChatProfileDrawer>
        </div>
        <div className="flex gap-1">
          {onLogout && currentUserName && <div className="flex items-center gap-2 mr-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {currentUserName}
              </span>
              
            </div>}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" disabled={imageMessages.length === 0} className="h-8 w-8 p-0">
                <Images className="w-4 h-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg pt-safe">
              <SheetHeader>
                <SheetTitle>Shared Photos</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px-env(safe-area-inset-top))] mt-4">
                <div className="grid grid-cols-2 gap-2">
                  {imageMessages.map(msg => <div key={msg.id} className="relative group">
                      <img src={msg.imageUrl} alt="Shared" className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setViewingImage(msg.imageUrl!)} />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg">
                        <p className="text-white text-xs truncate">{msg.text !== '📷 Photo' ? msg.text : formatTime(msg.timestamp)}</p>
                      </div>
                    </div>)}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
      </div>

      {/* Messages Area - With top padding for fixed header */}
      <ScrollArea className="flex-1 p-2 overflow-x-hidden relative" style={{
      paddingTop: 'calc(4rem + env(safe-area-inset-top))'
    }}>
        {/* Theme Background */}
        <ChatThemeBackground theme={currentTheme} />
        
        <div className="space-y-3 w-full overflow-hidden">
          {messages.map((message, index) => {
          const swipeState = swipeStates[message.id];
          const swipeOffset = swipeState ? swipeState.currentX - swipeState.startX : 0;
          const swipeProgress = Math.abs(swipeOffset) / 60; // 0 to 1 progress

          return <div key={message.id} className={cn("flex gap-1.5 message-enter relative overflow-hidden", message.isOwn ? "justify-end" : "justify-start")} style={{
            animationDelay: `${index * 50}ms`
          }}>
              {/* Reply icon that appears when swiping */}
              {swipeProgress > 0 && <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{
              opacity: swipeProgress,
              transform: `translateY(-50%) scale(${0.5 + swipeProgress * 0.5})`
            }}>
                  <Reply className="w-5 h-5 text-primary" />
                </div>}

              <div className="flex gap-1.5 items-end max-w-full" style={{
              transform: `translateX(${swipeOffset}px)`,
              transition: swipeState?.isSwiping ? 'none' : 'transform 0.3s ease-out'
            }} onMouseDown={e => handleSwipeStart(message.id, e.clientX)} onMouseMove={e => swipeState?.isSwiping && handleSwipeMove(message.id, e.clientX)} onMouseUp={() => handleSwipeEnd(message.id, message)} onMouseLeave={() => handleSwipeEnd(message.id, message)} onTouchStart={e => handleSwipeStart(message.id, e.touches[0].clientX)} onTouchMove={e => swipeState?.isSwiping && handleSwipeMove(message.id, e.touches[0].clientX)} onTouchEnd={() => handleSwipeEnd(message.id, message)}>
              {!message.isOwn && <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                  <AvatarImage src={friend.avatar} alt={friend.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                    {friend.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>}
              
            {message.audioUrl ?
              // Voice message with context menu for options
              <ContextMenu>
                <ContextMenuTrigger>
                  <div className="flex flex-col">
                    <div className={cn("rounded-xl px-2.5 py-1.5 smooth-transition cursor-pointer flex items-center gap-2 overflow-hidden", message.isOwn ? "message-sent text-white" : "bg-chat-received text-chat-received-foreground")} style={{ maxWidth: 'calc(100vw - 80px)' }} onClick={() => handleAudioClick(message.id, message.audioUrl!)}>
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", message.isOwn ? "bg-white/20" : "bg-primary/20")}>
                        {playingAudioId === message.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("h-6 flex items-center gap-0.5", message.isOwn ? "text-white/70" : "text-primary/70")}>
                          {[...Array(15)].map((_, i) => <div key={i} className={cn("w-0.5 rounded-full", message.isOwn ? "bg-white/50" : "bg-primary/50")} style={{
                          height: `${Math.random() * 100}%`,
                          minHeight: '20%'
                        }} />)}
                        </div>
                        <p className={cn("text-xs opacity-70 flex items-center gap-1", message.isOwn ? "text-white/70 justify-end" : "text-muted-foreground")}>
                          {formatTime(message.timestamp)}
                          <MessageStatus message={message} />
                        </p>
                      </div>
                    </div>
                    {/* Reactions display for voice messages */}
                    {getGroupedReactions(message.id).length > 0 && (
                      <div className="mt-1">
                        <MessageReactions
                          reactions={getGroupedReactions(message.id)}
                          onReact={(emoji) => toggleReaction(message.id, emoji)}
                          isOwn={message.isOwn}
                        />
                      </div>
                    )}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <SmilePlus className="w-4 h-4 mr-2" />
                      React
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent>
                      <ReactionPicker onReact={(emoji) => toggleReaction(message.id, emoji)} />
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuItem onClick={() => startReplyingTo(message)}>
                    <Reply className="w-4 h-4 mr-2" />
                    Reply
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onDeleteMessage(message.id, false)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete for me
                  </ContextMenuItem>
                  {message.isOwn && <ContextMenuItem onClick={() => onDeleteMessage(message.id, true)} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete for everyone
                  </ContextMenuItem>}
                </ContextMenuContent>
              </ContextMenu> :
              // Regular messages with context menu
              <ContextMenu>
                  <ContextMenuTrigger>
                    <div className={cn("rounded-xl px-2.5 py-1 smooth-transition cursor-pointer flex flex-col overflow-hidden", message.isOwn ? "message-sent text-white" : "bg-chat-received text-chat-received-foreground")} style={{ maxWidth: 'calc(100vw - 80px)', wordBreak: 'break-word' }}>
                      {message.repliedMessage && <div className={cn("text-xs p-2 rounded border-l-2 mb-1", message.isOwn ? "bg-white/10 border-white/30 text-white/70" : "bg-muted/50 border-primary/30 text-muted-foreground")}>
                          <div className="flex items-center gap-1 mb-1">
                            <Reply className="w-3 h-3" />
                            <span className="font-medium">{message.repliedMessage.isOwn ? 'You' : friend.name}</span>
                          </div>
                          <p className="truncate">
                            {message.repliedMessage.imageUrl ? '📷 Photo' : message.repliedMessage.text}
                          </p>
                        </div>}
                      {editingMessageId === message.id ? <div className="flex flex-col gap-2">
                          <Input value={editContent} onChange={e => setEditContent(e.target.value)} className="bg-white/10 border-white/20 text-white" autoFocus />
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={saveEdit} className="h-7 text-white hover:bg-white/20">
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 text-white hover:bg-white/20">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div> : <>
                          {message.imageUrl ? <div className="flex flex-col gap-2">
                              <img src={message.imageUrl} alt="Shared image" className="rounded-lg max-w-full w-auto max-h-[300px] object-contain cursor-pointer" onClick={() => setViewingImage(message.imageUrl!)} />
                              {message.text !== '📷 Photo' && <p className="text-sm leading-relaxed">{renderMessageText(message.text)}</p>}
                            </div> : <>
                              <p className="text-sm leading-relaxed">{renderMessageText(message.text)}</p>
                              {message.isEdited && <span className={cn("text-xs opacity-50 italic", message.isOwn ? "text-white/50" : "text-muted-foreground")}> (edited)</span>}
                            </>}
                          <p className={cn("text-xs mt-0.5 opacity-70 flex items-center gap-1", message.isOwn ? "text-white/70 justify-end" : "text-muted-foreground")}>
                            {formatTime(message.timestamp)}
                            <MessageStatus message={message} />
                          </p>
                        </>}
                      {/* Reactions display */}
                      {getGroupedReactions(message.id).length > 0 && (
                        <div className="mt-1">
                          <MessageReactions
                            reactions={getGroupedReactions(message.id)}
                            onReact={(emoji) => toggleReaction(message.id, emoji)}
                            isOwn={message.isOwn}
                          />
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <SmilePlus className="w-4 h-4 mr-2" />
                        React
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        <ReactionPicker onReact={(emoji) => toggleReaction(message.id, emoji)} />
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem onClick={() => startReplyingTo(message)}>
                      <Reply className="w-4 h-4 mr-2" />
                      Reply
                    </ContextMenuItem>
                    {message.isOwn && !message.audioUrl && !message.imageUrl && <ContextMenuItem onClick={() => startEditingMessage(message)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit message
                      </ContextMenuItem>}
                    <ContextMenuItem onClick={() => onDeleteMessage(message.id, false)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete for me
                    </ContextMenuItem>
                    {message.isOwn && <ContextMenuItem onClick={() => onDeleteMessage(message.id, true)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete for everyone
                      </ContextMenuItem>}
                  </ContextMenuContent>
                </ContextMenu>}
              </div>
            </div>;
        })}
          
          {/* Typing Indicator */}
          {isTyping && <div className="flex gap-3 justify-start">
              <Avatar className="w-8 h-8 mt-1">
                <AvatarImage src={friend.avatar} alt={friend.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                  {friend.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="bg-chat-received text-chat-received-foreground rounded-2xl px-4 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-typing rounded-full typing-dots"></div>
                  <div className="w-2 h-2 bg-typing rounded-full typing-dots" style={{
                animationDelay: '0.2s'
              }}></div>
                  <div className="w-2 h-2 bg-typing rounded-full typing-dots" style={{
                animationDelay: '0.4s'
              }}></div>
                </div>
              </div>
            </div>}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 pb-safe border-t border-border bg-card">
        {showCaptionInput && selectedImage && <div className="mb-3 p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-3">
              <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="w-16 h-16 object-cover rounded" />
              <div className="flex-1">
                <Textarea value={imageCaption} onChange={e => setImageCaption(e.target.value)} placeholder="Add a caption (optional)..." className="min-h-[60px] resize-none" />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleSendImageWithCaption}>
                    Send
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelImageSend}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>}
        {replyingTo && <div className="mb-2 p-2 bg-muted rounded-lg flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <Reply className="w-3 h-3" />
                <span className="font-medium">Replying to {replyingTo.isOwn ? 'yourself' : friend.name}</span>
              </div>
              <p className="text-sm truncate">{replyingTo.imageUrl ? '📷 Photo' : replyingTo.text}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={cancelReply} className="h-6 w-6 p-0">
              <XCircle className="w-4 h-4" />
            </Button>
          </div>}
        <form onSubmit={handleSend} className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
          {onSendImage && <Button type="button" size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-10">
              <ImageIcon className="w-4 h-4" />
            </Button>}
          <Input value={newMessage} onChange={e => {
            setNewMessage(e.target.value);
            onInputChange?.();
          }} placeholder={`Message ${friend.name}...`} className="flex-1 h-10 bg-background border-border focus:ring-primary" />
          <VoiceRecorder onSendVoice={handleSendVoice} />
          <Button type="submit" size="sm" className="message-sent border-0 h-10 px-4" disabled={!newMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
      
      <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
    </div>;
};