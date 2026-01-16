import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox as InboxIcon, 
  Building2, 
  GraduationCap, 
  Trophy, 
  HeadphonesIcon,
  ChevronRight,
  ArrowLeft,
  Send,
  MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, Conversation, ConversationContextType } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

const contextIcons: Record<ConversationContextType, React.ElementType> = {
  gym: Building2,
  coach: GraduationCap,
  event: Trophy,
  support: HeadphonesIcon,
  direct: MessageCircle,
};

const contextLabels: Record<ConversationContextType, string> = {
  gym: 'Gyms',
  coach: 'Coaches',
  event: 'Events',
  support: 'Support',
  direct: 'Direct',
};

export default function Inbox() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [messageText, setMessageText] = useState("");

  const { conversations, isLoading, unreadTotal } = useConversations({ status: 'all' });
  const { messages, isLoading: messagesLoading, isSending, sendMessage } = useMessages(selectedConversationId);

  // Group conversations by context type
  const groupedConversations = conversations.reduce((acc, conv) => {
    if (!acc[conv.context_type]) {
      acc[conv.context_type] = [];
    }
    acc[conv.context_type].push(conv);
    return acc;
  }, {} as Record<ConversationContextType, Conversation[]>);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  // Update URL when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      setSearchParams({ conversation: selectedConversationId });
    } else {
      setSearchParams({});
    }
  }, [selectedConversationId, setSearchParams]);

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    try {
      await sendMessage(messageText);
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday ' + format(date, 'HH:mm');
    }
    return format(date, 'MMM d, HH:mm');
  };

  const formatConversationTime = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Please sign in to view your inbox.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Mobile: Show either list or conversation */}
      <div className="flex flex-1 min-h-0">
        {/* Conversation List */}
        <AnimatePresence mode="wait">
          {(!selectedConversationId || window.innerWidth >= 768) && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={cn(
                "flex flex-col border-r border-border bg-card",
                selectedConversationId ? "hidden md:flex md:w-80 lg:w-96" : "flex-1 md:w-80 lg:w-96"
              )}
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <InboxIcon className="h-5 w-5" />
                    <h1 className="text-lg font-semibold">Inbox</h1>
                  </div>
                  {unreadTotal > 0 && (
                    <Badge variant="secondary">{unreadTotal} unread</Badge>
                  )}
                </div>
              </div>

              {/* Conversation Groups */}
              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Messages from gyms, coaches, and events will appear here
                    </p>
                  </div>
                ) : (
                  <div className="p-2 space-y-4">
                    {(['gym', 'coach', 'event', 'support'] as ConversationContextType[]).map(contextType => {
                      const convs = groupedConversations[contextType];
                      if (!convs || convs.length === 0) return null;
                      const Icon = contextIcons[contextType];

                      return (
                        <div key={contextType}>
                          <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                            <Icon className="h-3.5 w-3.5" />
                            {contextLabels[contextType]}
                          </div>
                          <div className="space-y-1">
                            {convs.map(conv => (
                              <button
                                key={conv.id}
                                onClick={() => setSelectedConversationId(conv.id)}
                                className={cn(
                                  "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                                  selectedConversationId === conv.id
                                    ? "bg-accent"
                                    : "hover:bg-muted"
                                )}
                              >
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarFallback>
                                    {conv.context_name?.[0]?.toUpperCase() || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-sm truncate">
                                      {conv.context_name}
                                    </p>
                                    {conv.last_message_at && (
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {formatConversationTime(conv.last_message_at)}
                                      </span>
                                    )}
                                  </div>
                                  {conv.subject && (
                                    <p className="text-xs text-muted-foreground truncate">
                                      {conv.subject}
                                    </p>
                                  )}
                                  {conv.last_message && (
                                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                                      {conv.last_message}
                                    </p>
                                  )}
                                </div>
                                {(conv.unread_count || 0) > 0 && (
                                  <Badge className="shrink-0">{conv.unread_count}</Badge>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation View */}
        <AnimatePresence mode="wait">
          {selectedConversationId ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 flex flex-col min-w-0"
            >
              {/* Conversation Header */}
              <div className="p-4 border-b border-border bg-card flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversationId(null)}
                  className="md:hidden p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {selectedConversation && (
                  <>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {selectedConversation.context_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedConversation.context_name}</p>
                      {selectedConversation.subject && (
                        <p className="text-sm text-muted-foreground truncate">
                          {selectedConversation.subject}
                        </p>
                      )}
                    </div>
                    <Badge variant={selectedConversation.status === 'open' ? 'default' : 'secondary'}>
                      {selectedConversation.status}
                    </Badge>
                  </>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => {
                      const isOwn = message.sender_user_id === user.id;
                      const isSystem = message.is_system_message;

                      if (isSystem) {
                        return (
                          <div key={message.id} className="flex justify-center">
                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                              {message.body_text}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex gap-2",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          {!isOwn && (
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={message.sender?.avatar_url || undefined} />
                              <AvatarFallback>
                                {message.sender?.display_name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-2",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}
                          >
                            {!isOwn && message.sender?.display_name && (
                              <p className="text-xs font-medium mb-1 opacity-70">
                                {message.sender.display_name}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.body_text}
                            </p>
                            <p className={cn(
                              "text-[10px] mt-1",
                              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Message Input */}
              {/* Always show message input - users can reply to any conversation */}
              <div className="p-4 border-t border-border bg-card pb-safe">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    maxLength={2000}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!messageText.trim() || isSending}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {selectedConversation?.status === 'closed' && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    This conversation was closed. Your reply will reopen it.
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
