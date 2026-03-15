import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { Search, UserPlus, Check, X, MessageCircle, Loader2, Users, UserCheck, Bell, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/page-header";
import { SummaryPanel } from "@/components/summary-panel";
import { EmptyState } from "@/components/empty-state";

export default function FriendsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const { data: friends = [], isLoading: friendsLoading } = useQuery({ queryKey: ["/api/friends"] });
  const { data: pendingRequests = [], isLoading: pendingLoading } = useQuery({ queryKey: ["/api/friends/pending"] });

  const sendRequest = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", "/api/friends/request", { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      toast({ title: t.common.success });
      handleSearch(searchQuery);
    },
    onError: (e: any) => toast({ title: t.common.error, description: e.message, variant: "destructive" }),
  });

  const acceptRequest = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/friends/accept/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      toast({ title: t.common.success });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/friends/reject/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/friends/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: t.common.success });
    },
  });

  const handleSearch = async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      const data = await res.json();
      setSearchResults(data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const UserAvatar = ({ u, size = "default" }: { u: any; size?: "default" | "lg" }) => {
    const sizeClass = size === "lg" ? "h-11 w-11" : "h-10 w-10";
    return (
      <Avatar className={sizeClass}>
        {u.profilePicture ? (
          <AvatarImage src={u.profilePicture} alt={u.fullName} />
        ) : null}
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold text-sm">
          {getInitials(u.fullName)}
        </AvatarFallback>
      </Avatar>
    );
  };

  const pendingCount = (pendingRequests as any[]).length;
  const friendCount = (friends as any[]).length;

  return (
    <div className="app-page-narrow space-y-6">
      <PageHeader
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.friends.connections}
          </>
        }
        icon={<Users className="h-6 w-6 text-primary" />}
        title={t.friends.title}
        description={
          friendCount > 0
            ? `${friendCount} ${t.profile.friendCount.toLowerCase()}`
            : t.friends.noFriends.split(".")[0]
        }
        >
        <div className="flex flex-wrap gap-3">
          <SummaryPanel label={t.friends.friendsLabel} value={friendCount} />
          <SummaryPanel label={t.friends.pendingLabel} value={pendingCount} />
        </div>
      </PageHeader>

      <Card className="app-surface p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.friends.search}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            className="pl-10 bg-muted/30 border-transparent focus:border-primary/30 focus:bg-background transition-colors"
            data-testid="input-friend-search"
          />
        </div>

        {searching && (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((u: any, index: number) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="app-surface-subtle flex items-center justify-between gap-3 flex-wrap rounded-2xl p-3 hover-elevate"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar u={u} />
                  <div>
                    <p className="font-medium text-sm" data-testid={`text-search-user-${u.id}`}>{u.fullName}</p>
                    <p className="text-xs text-muted-foreground">@{u.username}</p>
                  </div>
                </div>
                {u.friendshipStatus === "accepted" ? (
                  <Badge variant="secondary" data-testid={`badge-already-friend-${u.id}`}>
                    <UserCheck className="w-3 h-3 mr-1" />
                    {t.friends.myFriends.split(" ")[0]}
                  </Badge>
                ) : u.friendshipStatus === "pending" ? (
                  <Badge variant="outline" data-testid={`badge-pending-${u.id}`}>{t.friends.requested}</Badge>
                ) : (
                  <Button size="sm" onClick={() => sendRequest.mutate(u.id)} disabled={sendRequest.isPending} data-testid={`button-add-friend-${u.id}`}>
                    <UserPlus className="w-4 h-4 mr-1.5" /> {t.friends.addFriend}
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
          <EmptyState
            compact
            className="border-0 bg-transparent py-6 shadow-none"
            icon={<Search className="w-6 h-6 text-muted-foreground/40" />}
            title={<span data-testid="text-no-search-results">{t.common.noResults}</span>}
          />
        )}
      </Card>

      {pendingCount > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">{t.friends.pending}</h2>
            <Badge variant="secondary" className="text-xs" data-testid="badge-pending-section-count">
              {pendingCount}
            </Badge>
          </div>
          <div className="space-y-2">
            {(pendingRequests as any[]).map((req: any, index: number) => (
              <motion.div
                key={req.friendshipId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="app-surface p-4" data-testid={`card-pending-${req.friendshipId}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar u={req} />
                        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-chart-3 border-2 border-card" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{req.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{req.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptRequest.mutate(req.friendshipId)} disabled={acceptRequest.isPending} data-testid={`button-accept-${req.friendshipId}`}>
                        <Check className="w-4 h-4 mr-1.5" /> {t.friends.accept}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => rejectRequest.mutate(req.friendshipId)} disabled={rejectRequest.isPending} data-testid={`button-reject-${req.friendshipId}`}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-base font-semibold">{t.friends.myFriends}</h2>
          {friendCount > 0 && (
            <Badge variant="secondary" className="text-xs" data-testid="badge-friend-count">
              {friendCount}
            </Badge>
          )}
        </div>
        {friendsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : friendCount === 0 ? (
          <Card className="app-empty p-10 text-center">
            <div className="app-empty-icon">
              <Users className="w-7 h-7 text-primary/60" />
            </div>
            <p className="mb-1 font-semibold text-foreground" data-testid="text-no-friends">{t.friends.noFriends}</p>
            <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">{t.friends.search}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {(friends as any[]).map((friend: any, index: number) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="app-surface p-4 hover-elevate" data-testid={`card-friend-${friend.id}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <UserAvatar u={friend} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                            friend.online
                              ? "bg-green-500"
                              : "bg-muted-foreground/30"
                          }`}
                          data-testid={`status-online-${friend.id}`}
                        />
                        {friend.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-30" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm" data-testid={`text-friend-${friend.id}`}>{friend.fullName}</p>
                          {friend.online && (
                            <Badge variant="secondary" className="text-[10px]" data-testid={`badge-online-${friend.id}`}>
                              {t.friends.online}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">@{friend.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/chat?user=${friend.id}`)} data-testid={`button-chat-${friend.id}`}>
                        <MessageCircle className="w-4 h-4 mr-1.5" /> {t.friends.sendMessage}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => removeFriend.mutate(friend.friendshipId)} data-testid={`button-remove-${friend.id}`}>
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
