import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Inbox as InboxIcon, 
  ChevronRight,
  ArrowLeft,
  Send,
  MessageCircle,
  User,
  CheckCircle,
  XCircle,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePortalConversations, ConversationContextType, Conversation } from "@/hooks/useConversations";
import { useMessages } from "@/hooks/useMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";

interface PortalInboxProps {
  contextType: ConversationContextType;
  contextId?: string | null;
  staffMembers?: Array<{ user_id: string; display_name: string }>;
  title?: string;
}

export function PortalInbox({ 
  contextType, 
  contextId, 
  staffMembers = [],
  title = "Inbox" 
}: PortalInboxProps) {
  const { user } = useAuth();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('open');

  const { 
    conversations, 
    isLoading, 
    assignConversation, 
    updateStatus 
  } = usePortalConversations(contextType, contextId);
  
  const { 
    messages, 
    isLoading: messagesLoading, 
    isSending, 
    sendMessage 
  } = useMessages(selectedConversationId);

  const filteredConversations = conversations.filter(c => 
    statusFilter === 'all' || c.status === statusFilter
  );

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);

  const handleSend = async () => {
    if (!messageText.trim() || isSending) return;
    try {
      await sendMessage(messageText);
      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAssign = async (conversationId: string, staffUserId: string | null) => {
    try {
      await assignConversation(conversationId, staffUserId === 'unassign' ? null : staffUserId);
      toast.success(staffUserId === 'unassign' ? 'Unassigned' : 'Assigned successfully');
    } catch (error) {
      toast.error("Failed to assign conversation");
    }
  };

  const handleStatusChange = async (conversationId: string, status: 'open' | 'closed') => {
    try {
      await updateStatus(conversationId, status);
      toast.success(`Conversation ${status === 'closed' ? 'closed' : 'reopened'}`);
    } catch (error) {
      toast.error("Failed to update status");
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

  // For support context, contextId is not required
  if (!contextId && contextType !== 'support') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a {contextType} first</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <InboxIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge variant="secondary">{filteredConversations.length}</Badge>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 gap-4 min-h-0">
        {/* Conversation List / Table */}
        <div className={cn(
          "border rounded-lg bg-card flex flex-col",
          selectedConversationId ? "hidden lg:flex lg:w-1/2" : "flex-1"
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No conversations</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden md:table-cell">Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Assigned</TableHead>
                    <TableHead className="hidden md:table-cell">Updated</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConversations.map(conv => {
                    const userParticipant = conv.participants?.find(p => p.role === 'user');
                    const assignedStaff = staffMembers.find(s => s.user_id === conv.assigned_user_id);

                    return (
                      <TableRow 
                        key={conv.id}
                        className={cn(
                          "cursor-pointer",
                          selectedConversationId === conv.id && "bg-accent"
                        )}
                        onClick={() => setSelectedConversationId(conv.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={userParticipant?.avatar_url || undefined} />
                              <AvatarFallback>
                                {userParticipant?.display_name?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-sm truncate max-w-[120px]">
                              {userParticipant?.display_name || 'Unknown User'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                            {conv.subject || conv.last_message || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={conv.status === 'open' ? 'default' : 'secondary'}>
                            {conv.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8">
                                {assignedStaff ? (
                                  <span className="text-sm">{assignedStaff.display_name}</span>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Unassigned</span>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleAssign(conv.id, 'unassign')}>
                                Unassign
                              </DropdownMenuItem>
                              {staffMembers.map(staff => (
                                <DropdownMenuItem 
                                  key={staff.user_id}
                                  onClick={() => handleAssign(conv.id, staff.user_id)}
                                >
                                  {staff.display_name}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Conversation Detail */}
        <AnimatePresence mode="wait">
          {selectedConversationId && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(
                "border rounded-lg bg-card flex flex-col",
                "flex-1 lg:w-1/2"
              )}
            >
              {/* Header */}
              <div className="p-4 border-b flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedConversationId(null)}
                    className="lg:hidden p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  {selectedConversation && (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {selectedConversation.context_name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{selectedConversation.context_name}</p>
                        {selectedConversation.subject && (
                          <p className="text-xs text-muted-foreground">{selectedConversation.subject}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {selectedConversation && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(
                        selectedConversation.id,
                        selectedConversation.status === 'open' ? 'closed' : 'open'
                      )}
                    >
                      {selectedConversation.status === 'open' ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1" />
                          Close
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Reopen
                        </>
                      )}
                    </Button>
                  </div>
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
                      const isOwn = message.sender_user_id === user?.id;
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

              {/* Input */}
              {selectedConversation?.status === 'open' && (
                <div className="p-4 border-t">
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
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state for desktop */}
        {!selectedConversationId && (
          <div className="hidden lg:flex flex-1 items-center justify-center border rounded-lg bg-muted/20">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
