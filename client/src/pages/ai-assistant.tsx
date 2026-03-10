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
} from "lucide-react";
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
        <TooltipContent side="bottom" className="text-xs">Copy</TooltipContent>
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
      <div className="p-3 border-b space-y-3">
        <Button className="w-full gap-2" size="sm" onClick={handleNewChat} data-testid={`button-new-chat${testIdPrefix}`}>
          <Plus className="w-4 h-4" /> {t.ai.newChat}
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.ai.searchChats}
            className="pl-8 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background transition-colors"
            data-testid={`input-search${testIdPrefix}`}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className={`group p-2.5 rounded-md cursor-pointer text-sm transition-all ${
                activeChat?.id === chat.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover-elevate border border-transparent"
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
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t.ai.noChats}</p>
            </div>
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
  const [lastMeta, setLastMeta] = useState<{ provider: string; model: string; taskType: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerMenuRef = useRef<HTMLDivElement>(null);

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: providers = [] } = useQuery<ProviderInfo[]>({
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

  const loadChats = async () => {
    const all = await getAllChats();
    setChats(all);
    if (!activeChat && all.length > 0) {
      setActiveChat(all[0]);
    }
  };

  const handleNewChat = () => {
    const chat = createNewChat(subjectContext || undefined);
    setActiveChat(chat);
    setShowSidebar(false);
  };

  const handleSelectChat = async (id: string) => {
    const chat = await getChat(id);
    if (chat) {
      setActiveChat(chat);
      setShowSidebar(false);
    }
  };

  const handleDeleteChat = async (id: string) => {
    await deleteChat(id);
    if (activeChat?.id === id) {
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let chat = activeChat;
    if (!chat) {
      chat = createNewChat(subjectContext || undefined);
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    if (chat.messages.length === 0) {
      chat.title = generateChatTitle(input.trim());
    }

    chat.messages = [...chat.messages, userMessage];
    chat.updatedAt = Date.now();
    setActiveChat({ ...chat });
    setInput("");
    setIsLoading(true);

    try {
      const messages = chat.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
        timestamp: Date.now(),
      };
      chat.messages = [...chat.messages, assistantMessage];
      chat.updatedAt = Date.now();
      setActiveChat({ ...chat });

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
        const err = await res.json();
        throw new Error(err.message || "Failed to get response");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

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
              const updatedMessages = [...chat.messages];
              updatedMessages[updatedMessages.length - 1] = {
                ...assistantMessage,
                content: fullContent,
              };
              chat.messages = updatedMessages;
              setActiveChat({ ...chat });
            }
            if (event.error) {
              throw new Error(event.error);
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }

      chat.updatedAt = Date.now();
      setActiveChat({ ...chat });
      await saveChat(chat);
      await loadChats();
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const lastUserMsg = activeChat?.messages
      .filter((m) => m.role === "user")
      .pop()?.content;

    const starterPrompts: Record<string, string> = {
      explainSimply: "Explain quantum physics in simple terms",
      shortAnswer: "What is photosynthesis? Give a short exam-ready answer",
      examAnswer: "Write a detailed exam-style answer about Newton's laws of motion",
      makeMCQ: "Create 5 MCQ questions with answers about World War II",
      makeNotes: "Create concise revision notes on the water cycle",
      translateBn: "Translate the following to Bangla: Hello, how are you?",
      translateEn: "Translate the following to English: আমি ভালো আছি",
    };

    if (!lastUserMsg) {
      setInput(starterPrompts[action] || "");
      return;
    }

    const prompts: Record<string, string> = {
      explainSimply: `Explain this simply: ${lastUserMsg}`,
      shortAnswer: `Give a short exam-ready answer: ${lastUserMsg}`,
      examAnswer: `Write a detailed exam-style answer: ${lastUserMsg}`,
      makeMCQ: `Create 5 MCQ questions with answers from: ${lastUserMsg}`,
      makeQuiz: `Create a quiz with mixed question types from: ${lastUserMsg}`,
      makeNotes: `Create concise revision notes from: ${lastUserMsg}`,
      translateBn: `Translate the previous response to Bangla`,
      translateEn: `Translate the previous response to English`,
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
      toast({ title: t.common.success, description: `Imported ${count} chats` });
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
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-3rem)]">
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="absolute inset-0 z-40 md:relative md:z-0 flex"
          >
            <div className="w-72 bg-card border-r flex flex-col h-full">
              <ChatSidebarContent {...sidebarProps} testIdPrefix="" />
            </div>
            <div className="flex-1 bg-black/20 md:hidden" onClick={() => setShowSidebar(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden md:flex w-72 bg-card border-r flex-col h-full">
        <ChatSidebarContent {...sidebarProps} testIdPrefix="-desktop" />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card/50 backdrop-blur-sm relative z-20">
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
                {lastMeta.provider} · {lastMeta.taskType}
              </Badge>
            )}

            <div className="relative" ref={providerMenuRef}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProviderMenu(!showProviderMenu)}
                className="gap-1.5 text-xs"
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
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">AI Provider</p>
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
              <SelectTrigger className="w-[120px] text-xs h-8" data-testid="select-subject-context">
                <SelectValue placeholder={t.ai.selectSubject} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {!activeChat || activeChat.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
                <div className="relative mb-8">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/10 shadow-lg shadow-primary/5">
                    <GraduationCap className="w-12 h-12 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{t.ai.title}</h2>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed mb-8">
                  {t.app.description}
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-md w-full">
                  {quickActions.slice(0, 4).map((action) => (
                    <Button
                      key={action.key}
                      variant="outline"
                      size="sm"
                      className="py-3 px-4 text-xs gap-2 rounded-xl h-auto justify-start hover:bg-primary/5 hover:border-primary/20 transition-all"
                      onClick={() => handleQuickAction(action.key)}
                      data-testid={`button-action-${action.key}`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <action.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-left">{action.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
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
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted/80 border border-border/50 rounded-bl-sm"
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
          <div className="px-4 py-1.5 border-t border-border/50">
            <ScrollArea className="w-full">
              <div className="flex items-center gap-1.5 pb-0.5">
                {quickActions.map((action) => (
                  <Button
                    key={action.key}
                    variant="outline"
                    size="sm"
                    className="text-[11px] flex-shrink-0 py-1 px-2.5 gap-1 rounded-full h-auto"
                    onClick={() => handleQuickAction(action.key)}
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

        <div className="p-3 border-t bg-card/80 backdrop-blur-md">
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
                placeholder={t.ai.placeholder}
                className="resize-none min-h-[48px] max-h-[120px] text-sm pr-12 rounded-xl bg-muted/40 border-border/50 focus:border-primary/30 focus:bg-background focus:shadow-sm transition-all"
                rows={1}
                data-testid="textarea-ai-input"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 bottom-1.5 rounded-lg h-8 w-8 shadow-sm"
                data-testid="button-send"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
                placeholder="Encryption key..."
                data-testid="input-export-key"
              />
            </div>
            <Button className="w-full gap-2" onClick={handleExport} data-testid="button-do-export">
              <Download className="w-4 h-4" /> Export
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
              placeholder="Encryption key..."
              data-testid="input-import-key"
            />
            <Textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste encrypted data..."
              className="min-h-[100px]"
              data-testid="textarea-import-data"
            />
            <Button className="w-full gap-2" onClick={handleImport} data-testid="button-do-import">
              <Upload className="w-4 h-4" /> Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
