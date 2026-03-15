import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageCircle, ArrowLeft, User, Loader2, Check, CheckCheck, Search, Sparkles } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { saveDirectMessages, getLocalDirectMessages, addLocalDirectMessage } from "@/lib/chatStorage";
import { PageHeader } from "@/components/page-header";
import { SummaryPanel } from "@/components/summary-panel";
import { EmptyState } from "@/components/empty-state";

interface WSMessage {
  type: string;
  message?: any;
  userId?: number;
  online?: boolean;
}

export default function ChatPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const selectedUserId = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const val = params.get("user");
    return val ? parseInt(val, 10) : null;
  }, [searchString]);
  const selectedUserIdRef = useRef(selectedUserId);
  selectedUserIdRef.current = selectedUserId;

  const [messageText, setMessageText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [localMessages, setLocalMessages] = useState<any[]>([]);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const { data: conversations = [], isLoading: convsLoading } = useQuery({ queryKey: ["/api/messages/conversations"] });
  const { data: messages, isLoading: msgsLoading } = useQuery({
    queryKey: ["/api/messages", selectedUserId],
    enabled: !!selectedUserId,
  });

  const { data: friends = [] } = useQuery({ queryKey: ["/api/friends"] });

  const selectedFriend = selectedUserId
    ? (friends as any[]).find((f: any) => f.id === selectedUserId) ||
      (conversations as any[]).find((c: any) => c.user?.id === selectedUserId)?.user
    : null;

  useEffect(() => {
    setLocalMessages([]);
    if (selectedUserId && user?.id) {
      getLocalDirectMessages(user.id, selectedUserId).then((cached) => {
        if (cached.length > 0) {
          setLocalMessages(prev => prev.length === 0 ? cached : prev);
        }
      }).catch(() => {});
    }
  }, [selectedUserId, user?.id]);

  useEffect(() => {
    if (messages && Array.isArray(messages) && selectedUserId && user?.id) {
      setLocalMessages(messages);
      saveDirectMessages(user.id, selectedUserId, messages).catch(() => {});
    }
  }, [messages, selectedUserId, user?.id]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        if (data.type === "new_message" && data.message) {
          const currentSelectedId = selectedUserIdRef.current;
          if (
            currentSelectedId &&
            (data.message.senderId === currentSelectedId || data.message.receiverId === currentSelectedId)
          ) {
            setLocalMessages(prev => [...prev, data.message]);
          }
          if (user?.id) {
            addLocalDirectMessage(user.id, data.message).catch(() => {});
          }
          queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
        }
        if (data.type === "user_status" && data.userId !== undefined) {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            if (data.online) next.add(data.userId!);
            else next.delete(data.userId!);
            return next;
          });
        }
        if (data.type === "friend_request" || data.type === "friend_accepted") {
          queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
          queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
        }
      } catch {}
    };

    ws.onclose = () => {
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 3000);
    };

    return () => {
      ws.close();
    };
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedUserId || !messageText.trim()) return;
      const res = await apiRequest("POST", `/api/messages/${selectedUserId}`, { content: messageText.trim() });
      return res.json();
    },
    onSuccess: (msg) => {
      if (msg) {
        setLocalMessages(prev => [...prev, msg]);
        if (user?.id) {
          addLocalDirectMessage(user.id, msg).catch(() => {});
        }
      }
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
    },
    onError: () => toast({ title: t.common.error, variant: "destructive" }),
  });

  const handleSend = () => {
    if (messageText.trim() && selectedUserId) {
      sendMessage.mutate();
    }
  };

  const getInitials = (name: string) => name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const isOnline = (id: number, u?: any) => u?.online || onlineUsers.has(id);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t.chat.justNow;
    if (diffMins < 60) return `${diffMins}${t.chat.minutesAgoSuffix}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}${t.chat.hoursAgoSuffix}`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const allConversationItems = useMemo(() => {
    const convItems = (conversations as any[]).map((conv: any) => ({
      user: conv.user,
      lastMessage: conv.lastMessage,
      unreadCount: conv.unreadCount,
    }));
    const friendsNotInConvs = (friends as any[]).filter(
      (f: any) => !(conversations as any[]).some((c: any) => c.user.id === f.id)
    ).map((f: any) => ({ user: f, lastMessage: undefined, unreadCount: 0 }));
    return [...convItems, ...friendsNotInConvs];
  }, [conversations, friends]);

  const filteredItems = useMemo(() => {
    if (!sidebarSearch.trim()) return allConversationItems;
    const q = sidebarSearch.toLowerCase();
    return allConversationItems.filter(item =>
      item.user?.fullName?.toLowerCase().includes(q) ||
      item.user?.username?.toLowerCase().includes(q)
    );
  }, [allConversationItems, sidebarSearch]);

  const groupMessages = (msgs: any[]) => {
    const groups: { date: string; messages: any[] }[] = [];
    let currentDate = "";
    for (const msg of msgs) {
      const msgDate = msg.createdAt
        ? new Date(msg.createdAt).toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })
        : t.chat.today;
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  };

  const ConversationItem = ({ u, lastMessage, unreadCount, isSelected }: { u: any; lastMessage?: any; unreadCount?: number; isSelected: boolean }) => (
    <button
      className={`relative w-full rounded-none px-4 py-3 text-left transition-colors ${
        isSelected
          ? "bg-primary/8 dark:bg-primary/12"
          : "hover:bg-muted/35"
      }`}
      onClick={() => navigate(`/chat?user=${u.id}`)}
      data-testid={`chat-conv-${u.id}`}
    >
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />
      )}
      <div className="relative flex-shrink-0">
        <Avatar className={`h-10 w-10 ring-2 transition-all ${isSelected ? "ring-primary/30" : "ring-transparent"}`}>
          <AvatarImage src={u?.profilePicture} alt={u?.fullName} />
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-semibold">
            {u?.fullName ? getInitials(u.fullName) : <User className="w-4 h-4" />}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background transition-colors ${
            isOnline(u.id, u) ? "bg-emerald-500" : "bg-muted-foreground/30"
          }`}
          data-testid={`status-indicator-${u.id}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${isSelected ? "font-semibold" : "font-medium"}`}>{u.fullName}</p>
          {lastMessage?.createdAt && (
            <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 tabular-nums">
              {formatLastSeen(lastMessage.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="min-w-0 flex-1">
            {u.publicStatus ? (
              <p className="text-xs text-primary/70 dark:text-primary/60 truncate italic" data-testid={`text-status-${u.id}`}>
                {u.publicStatus}
              </p>
            ) : lastMessage?.content ? (
              <p className="text-xs text-muted-foreground truncate">{lastMessage.content}</p>
            ) : (
              <p className="text-xs text-muted-foreground/60 truncate">@{u.username}</p>
            )}
          </div>
          {(unreadCount ?? 0) > 0 && (
            <Badge variant="default" className="text-[10px] px-1.5 min-w-[1.25rem] justify-center flex-shrink-0" data-testid={`badge-unread-${u.id}`}>
              {unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );

  const messageGroups = groupMessages(localMessages);

  return (
    <div className="app-page space-y-4">
      <PageHeader
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.chat.messaging}
          </>
        }
        icon={<MessageCircle className="h-6 w-6 text-primary" />}
        title={t.chat.title}
        description={t.chat.pageDescription}
      >
        <div className="flex flex-wrap gap-3">
          <SummaryPanel label={t.chat.threads} value={allConversationItems.length} />
          <SummaryPanel
            label={t.chat.selectedLabel}
            value={selectedFriend?.fullName || t.chat.noThread}
            valueClassName="mt-1 text-sm font-semibold"
          />
        </div>
      </PageHeader>

      <div className="app-surface flex min-h-[calc(100vh-12rem)] overflow-hidden">
      <div className={`${selectedUserId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 lg:w-96 border-r bg-background`}>
        <div className="border-b border-border/60 bg-card/60 px-4 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-md bg-primary/10">
              <MessageCircle className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-lg" data-testid="text-chat-title">{t.chat.title}</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder={t.chat.searchPlaceholder}
              className="pl-9 bg-muted/50 border-transparent focus-visible:border-border focus-visible:ring-primary/20"
              data-testid="input-chat-search"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {convsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">{t.common.loading}</p>
            </div>
          ) : filteredItems.length === 0 && !sidebarSearch ? (
            <EmptyState
              compact
              className="border-0 bg-transparent px-6 py-16 shadow-none"
              icon={<MessageCircle className="w-7 h-7 text-primary/60" />}
              title={<span data-testid="text-no-conversations">{t.chat.noConversations}</span>}
              description={t.chat.addFriendsPrompt}
            />
          ) : filteredItems.length === 0 && sidebarSearch ? (
            <EmptyState
              compact
              className="border-0 bg-transparent px-6 py-16 shadow-none"
              icon={<Search className="w-8 h-8 text-muted-foreground/30" />}
              title={t.chat.searchEmpty}
            />
          ) : (
            <div className="py-1">
              {filteredItems.map((item) => (
                <ConversationItem
                  key={item.user.id}
                  u={item.user}
                  lastMessage={item.lastMessage}
                  unreadCount={item.unreadCount}
                  isSelected={selectedUserId === item.user.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${selectedUserId ? "flex" : "hidden md:flex"} flex-col flex-1 bg-background/80`}>
        {selectedUserId ? (
          <>
            <div className="border-b border-border/60 bg-card/55">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => navigate("/chat")} data-testid="button-back-chat">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                {selectedFriend && (
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-9 w-9 ring-2 ring-primary/15">
                        <AvatarImage src={selectedFriend?.profilePicture} alt={selectedFriend?.fullName} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-semibold">
                          {selectedFriend?.fullName ? getInitials(selectedFriend.fullName) : <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background transition-colors ${
                        isOnline(selectedUserId, selectedFriend) ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm" data-testid="text-chat-partner-name">{selectedFriend.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {isOnline(selectedUserId, selectedFriend) ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t.friends.online}</span>
                        ) : t.friends.offline}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.04),transparent_30%)] px-4 py-4">
              {msgsLoading && !messages ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">{t.common.loading}</p>
                </div>
              ) : localMessages.length === 0 ? (
                <EmptyState
                  compact
                  className="border-0 bg-transparent py-16 shadow-none"
                  icon={<MessageCircle className="w-8 h-8 text-primary/30" />}
                  title={<span data-testid="text-no-messages">{t.chat.noMessages}</span>}
                  description={selectedFriend?.fullName ? `${t.chat.startConversationWith} ${selectedFriend.fullName}` : ""}
                />
              ) : (
                <div className="mx-auto max-w-4xl space-y-4">
                  {messageGroups.map((group, gi) => (
                    <div key={gi}>
                      <div className="flex items-center justify-center my-4">
                        <span className="text-[10px] text-muted-foreground/60 bg-muted/60 dark:bg-muted/40 px-3 py-1 rounded-full font-medium" data-testid={`text-date-separator-${gi}`}>
                          {group.date}
                        </span>
                      </div>
                      <AnimatePresence>
                        {group.messages.map((msg: any, idx: number) => {
                          const isMine = msg.senderId === user?.id;
                          const showAvatar = !isMine && (idx === 0 || group.messages[idx - 1]?.senderId !== msg.senderId);
                          const isLastInGroup = idx === group.messages.length - 1 || group.messages[idx + 1]?.senderId !== msg.senderId;
                          return (
                            <motion.div
                              key={msg.id || `${gi}-${idx}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.15, delay: idx * 0.02 }}
                              className={`flex items-end gap-2 ${isLastInGroup ? "mb-2" : "mb-0.5"} ${isMine ? "justify-end" : "justify-start"}`}
                            >
                              {!isMine && (
                                <div className="w-6 flex-shrink-0">
                                  {showAvatar && selectedFriend && (
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={selectedFriend?.profilePicture} alt={selectedFriend?.fullName} />
                                      <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-[8px] font-semibold">
                                        {getInitials(selectedFriend?.fullName || "")}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              )}
                              <div
                                className={`max-w-[70%] border px-3.5 py-2.5 text-sm shadow-sm transition-colors ${
                                  isMine
                                    ? `border-primary/80 bg-primary text-primary-foreground ${isLastInGroup ? "rounded-2xl rounded-br-sm" : "rounded-2xl"}`
                                    : `border-border/50 bg-card ${isLastInGroup ? "rounded-2xl rounded-bl-sm" : "rounded-2xl"}`
                                }`}
                                data-testid={`message-${msg.id || idx}`}
                              >
                                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : ""}`}>
                                  <span className={`text-[10px] ${isMine ? "text-primary-foreground/50" : "text-muted-foreground/60"}`}>
                                    {msg.createdAt ? formatTime(msg.createdAt) : ""}
                                  </span>
                                  {isMine && (
                                    msg.read ? (
                                      <CheckCheck className="w-3 h-3 text-primary-foreground/60" />
                                    ) : (
                                      <Check className="w-3 h-3 text-primary-foreground/40" />
                                    )
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border/60 bg-card/70 px-4 py-3 backdrop-blur-md">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={t.chat.placeholder}
                  className="flex-1 rounded-full bg-muted/40 dark:bg-muted/30 border-transparent focus-visible:border-primary/30 focus-visible:ring-primary/20 transition-colors"
                  data-testid="input-chat-message"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!messageText.trim() || sendMessage.isPending}
                  data-testid="button-send-message"
                  className="rounded-full flex-shrink-0"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              className="border-0 bg-transparent px-6 shadow-none"
              icon={<MessageCircle className="h-10 w-10 text-primary/25" />}
              title={<span data-testid="text-select-chat">{t.chat.selectChat}</span>}
              description={t.chat.addFriendsPrompt}
            />
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
