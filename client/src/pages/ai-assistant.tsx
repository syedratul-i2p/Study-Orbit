import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Plus,
  Search,
  Brain,
  Pin,
  Trash2,
  Download,
  Upload,
  Loader2,
  Sparkles,
  BookOpen,
  PenTool,
  FileText,
  HelpCircle,
  Languages,
  ClipboardList,
  Menu,
  Zap,
  ChevronDown,
  MessageSquare,
  Bot,
  Copy,
  Check,
  GraduationCap,
  RefreshCw,
  Square,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SummaryPanel } from "@/components/summary-panel";
import { EmptyState } from "@/components/empty-state";
import {
  type ChatConversation,
  type ChatMessage,
  getAllChats,
  getChat,
  saveChat,
  deleteChat,
  createNewChat,
  generateChatTitle,
  exportChats,
  importChats,
} from "@/lib/chatStorage";
import type { Subject } from "@shared/schema";

type AIProvider = "auto" | "orbitquick" | "orbitdeep" | "studyexpert";

interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  mode?: string;
  strengths: string[];
}

const providerIcons: Record<string, typeof Brain> = {
  orbitquick: Zap,
  orbitdeep: Brain,
  studyexpert: BookOpen,
};

const providerColors: Record<string, string> = {
  orbitquick: "text-amber-500",
  orbitdeep: "text-purple-500",
  studyexpert: "text-emerald-500",
};

function CopyButton({ text }: { text: string }) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="absolute -bottom-3 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity w-6 h-6 rounded-md bg-background border border-border/50 shadow-sm flex items-center justify-center hover:bg-muted"
            onClick={handleCopy}
            data-testid="button-copy-message"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">{t.ai.copy}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ChatSidebarContent({
  filteredChats,
  activeChat,
  searchQuery,
  setSearchQuery,
  handleNewChat,
  handleSelectChat,
  handlePinChat,
  handleDeleteChat,
  setExportOpen,
  setImportOpen,
  t,
  testIdPrefix = "",
}: {
  filteredChats: ChatConversation[];
  activeChat: ChatConversation | null;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  handleNewChat: () => void;
  handleSelectChat: (id: string) => void;
  handlePinChat: (id: string) => void;
  handleDeleteChat: (id: string) => void;
  setExportOpen: (v: boolean) => void;
  setImportOpen: (v: boolean) => void;
  t: any;
  testIdPrefix?: string;
}) {
  return (
    <>
      <div className="space-y-3 border-b border-border/60 bg-card/60 p-3">
        <Button className="w-full gap-2 rounded-2xl" size="sm" onClick={handleNewChat} data-testid={`button-new-chat${testIdPrefix}`}>
          <Plus className="w-4 h-4" /> {t.ai.newChat}
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.ai.searchChats}
            className="border-transparent bg-muted/50 pl-8 text-sm transition-colors focus:border-border focus:bg-background"
            data-testid={`input-search${testIdPrefix}`}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`group cursor-pointer rounded-2xl p-3 text-sm transition-all ${
                activeChat?.id === chat.id
                  ? "border border-primary/20 bg-primary/10"
                  : "border border-transparent hover-elevate"
              }`}
              onClick={() => handleSelectChat(chat.id)}
              data-testid={`chat-item${testIdPrefix}-${chat.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <p className="font-medium truncate flex items-center gap-1">
                    {chat.pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0" />}
                    {chat.title}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 invisible group-hover:visible transition-opacity flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handlePinChat(chat.id); }}
                    data-testid={`button-pin-chat${testIdPrefix}-${chat.id}`}
                  >
                    <Pin className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                    data-testid={`button-delete-chat${testIdPrefix}-${chat.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 pl-[22px]">
                {new Date(chat.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))}
          {filteredChats.length === 0 && (
          <EmptyState
            compact
            className="border-0 bg-transparent py-8 shadow-none"
            icon={<MessageSquare className="h-8 w-8 text-muted-foreground/40" />}
            title={t.ai.noChats}
          />
          )}
        </div>
      </ScrollArea>
      <div className="p-2 border-t flex gap-1">
        <Button size="sm" variant="ghost" className="flex-1 text-xs gap-1" onClick={() => setExportOpen(true)} data-testid={`button-export${testIdPrefix}`}>
          <Download className="w-3 h-3" /> {t.ai.exportChat}
        </Button>
        <Button size="sm" variant="ghost" className="flex-1 text-xs gap-1" onClick={() => setImportOpen(true)} data-testid={`button-import${testIdPrefix}`}>
          <Upload className="w-3 h-3" /> {t.ai.importChat}
        </Button>
      </div>
    </>
  );
}

export default function AIAssistantPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatConversation[]>([]);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [subjectContext, setSubjectContext] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [encKey, setEncKey] = useState("");
  const [importData, setImportData] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("auto");
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [lastMeta, setLastMeta] = useState<{ provider: string; model: string; taskType: string; mode?: string; routingReason?: string } | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerMenuRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: providers = [], refetch: refetchProviders, isFetching: providersLoading } = useQuery<ProviderInfo[]>({
    queryKey: ["/api/ai/providers"],
  });

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (providerMenuRef.current && !providerMenuRef.current.contains(e.target as Node)) {
        setShowProviderMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableProviders = providers.filter((provider) => provider.available);
  const aiAvailable = availableProviders.length > 0;

  useEffect(() => {
    if (
      selectedProvider !== "auto" &&
      providers.length > 0 &&
      !providers.some((provider) => provider.id === selectedProvider && provider.available)
    ) {
      setSelectedProvider("auto");
    }
  }, [providers, selectedProvider]);

  const loadChats = async () => {
    const all = await getAllChats();
    setChats(all);
    if (!activeChat && all.length > 0) {
      setActiveChat(all[0]);
    }
  };

  const handleNewChat = () => {
    const chat = { ...createNewChat(subjectContext || undefined), title: t.ai.newChat };
    setRequestError(null);
    setActiveChat(chat);
    setShowSidebar(false);
  };

  const handleSelectChat = async (id: string) => {
    const chat = await getChat(id);
    if (chat) {
      setRequestError(null);
      setActiveChat(chat);
      setShowSidebar(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChat(id);
    if (activeChat?.id === id) {
      setRequestError(null);
      setActiveChat(null);
    }
    await loadChats();
  };

  const handlePinChat = async (id: string) => {
    const chat = await getChat(id);
    if (chat) {
      chat.pinned = !chat.pinned;
      await saveChat(chat);
      await loadChats();
      if (activeChat?.id === id) setActiveChat({ ...chat });
    }
  };

  const streamAssistantReply = async (chat: ChatConversation) => {
    if (!aiAvailable || isLoading) return;

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    let workingChat: ChatConversation = {
      ...chat,
      messages: [...chat.messages, assistantMessage],
      updatedAt: Date.now(),
    };

    setRequestError(null);
    setIsLoading(true);
    setActiveChat(workingChat);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let fullContent = "";

    try {
      const messages = chat.messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: abortController.signal,
        body: JSON.stringify({
          messages,
          provider: selectedProvider,
          userContext: {
            classLevel: user?.classLevel,
            department: user?.department,
            board: user?.board,
            subjectContext: subjectContext || undefined,
            chatLanguage: user?.chatLanguage,
          },
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.message || t.ai.responseFailed);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error(t.ai.responseStreamMissing);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          try {
            const event = JSON.parse(line.slice(6));
            if (event.meta) {
              setLastMeta(event.meta);
            }
            if (event.content) {
              fullContent += event.content;
              workingChat = {
                ...workingChat,
                messages: [
                  ...workingChat.messages.slice(0, -1),
                  { ...assistantMessage, content: fullContent },
                ],
                updatedAt: Date.now(),
              };
              setActiveChat(workingChat);
            }
            if (event.error) {
              throw new Error(event.error);
            }
          } catch (eventError) {
            if (!(eventError instanceof SyntaxError)) throw eventError;
          }
        }
      }

      if (!fullContent.trim()) {
        throw new Error(t.ai.responseEmpty);
      }

      await saveChat(workingChat);
      await loadChats();
      setActiveChat(workingChat);
    } catch (error: any) {
      const isAbort = error?.name === "AbortError";
      const fallbackMessage = isAbort ? t.ai.generationStopped : error?.message || t.ai.responseFailed;
      setRequestError(fallbackMessage);

      const cleanedMessages =
        fullContent?.trim()
          ? workingChat.messages
          : workingChat.messages.slice(0, -1);

      const cleanedChat = {
        ...workingChat,
        messages: cleanedMessages,
        updatedAt: Date.now(),
      };

      setActiveChat(cleanedChat);
      await saveChat(cleanedChat);
      await loadChats();

      toast({
        title: isAbort ? t.ai.generationStoppedTitle : t.common.error,
        description: fallbackMessage,
        variant: isAbort ? "default" : "destructive",
      });
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !aiAvailable) return;

    let chat = activeChat;
    if (!chat) {
      chat = createNewChat(subjectContext || undefined);
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    const nextChat: ChatConversation = {
      ...chat,
      title: chat.messages.length === 0 ? generateChatTitle(input.trim()) : chat.title,
      messages: [...chat.messages, userMessage],
      updatedAt: Date.now(),
    };

    setInput("");
    setActiveChat(nextChat);
    await streamAssistantReply(nextChat);
  };

  const handleRetry = async () => {
    if (!activeChat || isLoading || !aiAvailable) return;
    if (activeChat.messages[activeChat.messages.length - 1]?.role !== "user") return;
    await streamAssistantReply(activeChat);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleQuickAction = (action: string) => {
    const lastUserMsg = activeChat?.messages
      .filter((m) => m.role === "user")
      .pop()?.content;

    const starterPrompts: Record<string, string> = {
      explainSimply: t.ai.starterPrompts.explainSimply,
      shortAnswer: t.ai.starterPrompts.shortAnswer,
      examAnswer: t.ai.starterPrompts.examAnswer,
      makeMCQ: t.ai.starterPrompts.makeMCQ,
      makeNotes: t.ai.starterPrompts.makeNotes,
      translateBn: t.ai.starterPrompts.translateBn,
      translateEn: t.ai.starterPrompts.translateEn,
    };

    if (!lastUserMsg) {
      setInput(starterPrompts[action] || "");
      return;
    }

    const prompts: Record<string, string> = {
      explainSimply: t.ai.promptTemplates.explainSimply.replace("{content}", lastUserMsg),
      shortAnswer: t.ai.promptTemplates.shortAnswer.replace("{content}", lastUserMsg),
      examAnswer: t.ai.promptTemplates.examAnswer.replace("{content}", lastUserMsg),
      makeMCQ: t.ai.promptTemplates.makeMCQ.replace("{content}", lastUserMsg),
      makeQuiz: t.ai.promptTemplates.makeQuiz.replace("{content}", lastUserMsg),
      makeNotes: t.ai.promptTemplates.makeNotes.replace("{content}", lastUserMsg),
      translateBn: t.ai.promptTemplates.translateBn,
      translateEn: t.ai.promptTemplates.translateEn,
    };

    setInput(prompts[action] || "");
  };

  const handleExport = async () => {
    if (!encKey.trim()) return;
    try {
      const data = await exportChats(encKey);
      const blob = new Blob([data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `study-orbit-chats-${Date.now()}.enc`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      toast({ title: t.common.success });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!encKey.trim() || !importData.trim()) return;
    try {
      const count = await importChats(importData, encKey);
      await loadChats();
      setImportOpen(false);
      toast({ title: t.common.success, description: t.ai.importedChats.replace("{count}", String(count)) });
    } catch (error: any) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    }
  };

  const filteredChats = searchQuery
    ? chats.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;

  const selectedProviderInfo =
    selectedProvider === "auto"
      ? null
      : providers.find((provider) => provider.id === selectedProvider) ?? null;
  const canRetryLastTurn =
    Boolean(requestError) &&
    Boolean(activeChat) &&
    activeChat!.messages[activeChat!.messages.length - 1]?.role === "user" &&
    aiAvailable &&
    !isLoading;

  const quickActions = [
    { key: "explainSimply", label: t.ai.explainSimply, icon: HelpCircle },
    { key: "shortAnswer", label: t.ai.shortAnswer, icon: PenTool },
    { key: "examAnswer", label: t.ai.examAnswer, icon: FileText },
    { key: "makeMCQ", label: t.ai.makeMCQ, icon: ClipboardList },
    { key: "makeNotes", label: t.ai.makeNotes, icon: BookOpen },
    { key: "translateBn", label: t.ai.translateBn, icon: Languages },
    { key: "translateEn", label: t.ai.translateEn, icon: Languages },
  ];

  const sidebarProps = {
    filteredChats,
    activeChat,
    searchQuery,
    setSearchQuery,
    handleNewChat,
    handleSelectChat,
    handlePinChat,
    handleDeleteChat,
    setExportOpen,
    setImportOpen,
    t,
  };

  return (
    <div className="app-page space-y-4">
      <PageHeader
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            {t.ai.workspaceBadge}
          </>
        }
        icon={<Brain className="h-6 w-6 text-primary" />}
        title={t.ai.title}
        description={t.ai.workspaceDescription}
      >
        <div className="flex flex-wrap gap-3">
          <SummaryPanel label={t.ai.savedChats} value={chats.length} />
          <SummaryPanel
            label={t.ai.subjectLabel}
            value={subjectContext || t.ai.general}
            valueClassName="mt-1 text-sm font-semibold"
          />
          <SummaryPanel
            label={t.ai.modeLabel}
            value={selectedProvider === "auto" ? t.ai.autoRouting : selectedProviderInfo?.name || t.ai.autoRouting}
            valueClassName="mt-1 text-sm font-semibold"
          />
        </div>
      </PageHeader>

      <div className="app-surface flex min-h-[calc(100vh-12rem)] overflow-hidden">
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="absolute inset-0 z-40 md:relative md:z-0 flex"
          >
            <div className="h-full w-72 border-r border-border/60 bg-background/90 backdrop-blur-md flex flex-col">
              <ChatSidebarContent {...sidebarProps} testIdPrefix="" />
            </div>
            <div className="flex-1 bg-black/20 md:hidden" onClick={() => setShowSidebar(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden h-full w-72 border-r border-border/60 bg-background/90 backdrop-blur-md md:flex md:flex-col">
        <ChatSidebarContent {...sidebarProps} testIdPrefix="-desktop" />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="relative z-20 flex items-center gap-3 border-b border-border/60 bg-card/55 px-4 py-3 backdrop-blur-md">
          <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setShowSidebar(true)} data-testid="button-toggle-chat-sidebar">
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm truncate">{activeChat?.title || t.ai.title}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {lastMeta && (
              <Badge variant="outline" className="text-[10px] gap-1 hidden sm:flex">
                {(() => {
                  const Icon = providerIcons[lastMeta.provider] || Brain;
                  return <Icon className={`w-2.5 h-2.5 ${providerColors[lastMeta.provider] || ""}`} />;
                })()}
                {lastMeta.mode || lastMeta.provider} · {lastMeta.taskType}
              </Badge>
            )}

            <div className="relative" ref={providerMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProviderMenu(!showProviderMenu)}
                className="gap-1.5 rounded-2xl text-xs"
                data-testid="button-page-provider-select"
              >
                {selectedProvider === "auto" ? (
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                ) : (
                  (() => {
                    const Icon = providerIcons[selectedProvider] || Brain;
                    return <Icon className={`w-3.5 h-3.5 ${providerColors[selectedProvider] || ""}`} />;
                  })()
                )}
                <span className="font-medium hidden sm:inline">
                  {selectedProvider === "auto" ? t.ai.autoRouting :
                   selectedProvider === "orbitquick" ? t.ai.providerOrbitQuick :
                   selectedProvider === "orbitdeep" ? t.ai.providerOrbitDeep :
                   selectedProvider === "studyexpert" ? t.ai.providerStudyExpert : selectedProvider}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>

              <AnimatePresence>
                {showProviderMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1.5 z-50 bg-popover border rounded-md shadow-lg py-1.5 min-w-[260px]"
                  >
                    <div className="px-3 py-1.5 mb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.ai.providerLabel}</p>
                    </div>
                    <button
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-xs transition-colors hover:bg-muted ${
                        selectedProvider === "auto" ? "bg-primary/10" : ""
                      }`}
                      onClick={() => { setSelectedProvider("auto"); setShowProviderMenu(false); }}
                      data-testid="page-option-auto"
                    >
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-[13px]">{t.ai.smartRouting}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.ai.smartRoutingDesc}</p>
                      </div>
                      {selectedProvider === "auto" && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </button>
                    {providers.map((p) => {
                      const Icon = providerIcons[p.id] || Brain;
                      const colorClass = providerColors[p.id] || "";
                      const bgMap: Record<string, string> = {
                        orbitquick: "bg-amber-500/10",
                        orbitdeep: "bg-purple-500/10",
                        studyexpert: "bg-emerald-500/10",
                      };
                      const desc = p.id === "orbitquick" ? t.ai.orbitQuickDesc :
                                   p.id === "orbitdeep" ? t.ai.orbitDeepDesc :
                                   p.id === "studyexpert" ? t.ai.studyExpertDesc : "";
                      return (
                        <button
                          key={p.id}
                          className={`w-full flex items-start gap-3 px-3 py-2.5 text-xs transition-colors hover:bg-muted ${
                            !p.available ? "opacity-40 cursor-not-allowed" : ""
                          } ${selectedProvider === p.id ? "bg-primary/10" : ""}`}
                          onClick={() => {
                            if (p.available) {
                              setSelectedProvider(p.id as AIProvider);
                              setShowProviderMenu(false);
                            }
                          }}
                          disabled={!p.available}
                          data-testid={`page-option-${p.id}`}
                        >
                          <div className={`w-7 h-7 rounded-md ${bgMap[p.id] || "bg-muted"} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-semibold text-[13px]">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                              {!p.available ? t.ai.providerUnavailable : desc}
                            </p>
                          </div>
                          {selectedProvider === p.id && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-2" />
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Select value={subjectContext} onValueChange={setSubjectContext}>
              <SelectTrigger className="h-8 w-[120px] rounded-xl text-xs" data-testid="select-subject-context">
                <SelectValue placeholder={t.ai.selectSubject} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t.ai.general}</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!aiAvailable && !providersLoading && (
          <div className="border-b border-border/60 bg-amber-50/70 px-4 py-3 dark:bg-amber-950/20">
            <div className="mx-auto flex max-w-3xl items-start gap-3">
              <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 dark:bg-amber-900/30">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">{t.ai.unavailableTitle}</p>
                <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200/80">{t.ai.unavailableDescription}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl"
                onClick={() => refetchProviders()}
                data-testid="button-refetch-ai-providers"
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                {t.ai.retry}
              </Button>
            </div>
          </div>
        )}

        {requestError && (
          <div className="border-b border-border/60 bg-destructive/5 px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-start gap-3">
              <div className="mt-0.5 rounded-full bg-destructive/10 p-1.5">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{t.ai.responseIssue}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{requestError}</p>
              </div>
              {canRetryLastTurn && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-xl"
                  onClick={handleRetry}
                  data-testid="button-retry-ai-request"
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                  {t.ai.retry}
                </Button>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.04),transparent_28%)] p-4">
            {!activeChat || activeChat.messages.length === 0 ? (
              <div className="flex min-h-[400px] items-center justify-center px-4">
                <EmptyState
                  className="w-full max-w-2xl border-0 bg-transparent shadow-none"
                  icon={<GraduationCap className={`w-12 h-12 ${aiAvailable ? "text-primary" : "text-amber-500"}`} />}
                  title={aiAvailable ? t.ai.title : t.ai.unavailableTitle}
                  description={aiAvailable ? t.ai.workspaceDescription : t.ai.unavailableDescription}
                  action={
                    <div className="grid w-full max-w-md grid-cols-2 gap-2">
                      {quickActions.slice(0, 4).map((action) => (
                        <Button
                          key={action.key}
                          variant="outline"
                          size="sm"
                          className="h-auto justify-start gap-2 rounded-2xl px-4 py-3 text-xs transition-all hover:border-primary/20 hover:bg-primary/5"
                          onClick={() => handleQuickAction(action.key)}
                          disabled={!aiAvailable}
                          data-testid={`button-action-${action.key}`}
                        >
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <action.icon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-left">{action.label}</span>
                        </Button>
                      ))}
                      {!aiAvailable && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="col-span-2 rounded-2xl"
                          onClick={() => refetchProviders()}
                          data-testid="button-empty-retry-providers"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {t.ai.retry}
                        </Button>
                      )}
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-4">
                {activeChat.messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.02 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`group/msg flex items-start gap-2.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="relative">
                        <div
                          className={`rounded-2xl px-4 py-3 ${
                            msg.role === "user"
                              ? "rounded-br-sm border border-primary/80 bg-primary text-primary-foreground"
                              : "rounded-bl-sm border border-border/50 bg-card"
                          }`}
                          data-testid={`message-${msg.role}-${i}`}
                        >
                          {msg.role === "assistant" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:bg-background/80 [&_pre]:border [&_pre]:border-border/50 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_code]:text-[12px] [&_code]:leading-relaxed [&_p]:text-[13px] [&_p]:leading-relaxed [&_li]:text-[13px] [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_h3]:font-semibold [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_blockquote]:border-l-primary/30 [&_blockquote]:text-muted-foreground">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="m-0 whitespace-pre-wrap text-[13px] leading-relaxed">{msg.content}</p>
                          )}
                          <div className={`flex items-center justify-between mt-1.5 gap-2`}>
                            <p className={`text-[10px] ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground/50"}`}>
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        {msg.role === "assistant" && msg.content && (
                          <CopyButton text={msg.content} />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {isLoading && activeChat.messages[activeChat.messages.length - 1]?.content === "" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-muted-foreground ml-1">{t.ai.thinking}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {activeChat && activeChat.messages.length > 0 && (
          <div className="border-t border-border/60 bg-card/50 px-4 py-2">
            <ScrollArea className="w-full">
              <div className="flex items-center gap-1.5 pb-0.5">
                {quickActions.map((action) => (
                  <Button
                    key={action.key}
                    variant="outline"
                    size="sm"
                    className="h-auto flex-shrink-0 gap-1 rounded-full px-2.5 py-1 text-[11px]"
                    onClick={() => handleQuickAction(action.key)}
                    disabled={!aiAvailable}
                    data-testid={`button-quick-${action.key}`}
                  >
                    <action.icon className="w-3 h-3" />
                    {action.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="border-t border-border/60 bg-card/75 p-3 backdrop-blur-md">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={aiAvailable ? t.ai.placeholder : t.ai.unavailableInputPlaceholder}
                className="min-h-[52px] max-h-[120px] resize-none rounded-2xl border-border/50 bg-muted/40 pr-12 text-sm transition-all focus:border-primary/30 focus:bg-background focus:shadow-sm"
                rows={1}
                disabled={!aiAvailable}
                data-testid="textarea-ai-input"
              />
              <Button
                size="icon"
                onClick={isLoading ? handleStop : handleSend}
                disabled={(!input.trim() && !isLoading) || (!aiAvailable && !isLoading)}
                className="absolute bottom-1.5 right-1.5 h-8 w-8 rounded-xl shadow-sm"
                data-testid="button-send"
              >
                {isLoading ? (
                  <Square className="w-3.5 h-3.5" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.ai.exportChat}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                type="password"
                value={encKey}
                onChange={(e) => setEncKey(e.target.value)}
                    placeholder={t.ai.exportKeyPlaceholder}
                data-testid="input-export-key"
              />
            </div>
            <Button className="w-full gap-2" onClick={handleExport} data-testid="button-do-export">
              <Download className="w-4 h-4" /> {t.ai.exportAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.ai.importChat}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              value={encKey}
              onChange={(e) => setEncKey(e.target.value)}
                    placeholder={t.ai.importKeyPlaceholder}
              data-testid="input-import-key"
            />
            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
                    placeholder={t.ai.importDataPlaceholder}
              className="min-h-[100px]"
              data-testid="textarea-import-data"
            />
            <Button className="w-full gap-2" onClick={handleImport} data-testid="button-do-import">
              <Upload className="w-4 h-4" /> {t.ai.importAction}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
