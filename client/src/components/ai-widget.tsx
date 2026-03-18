import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/lib/languageContext";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AIMarkdown } from "@/components/ai-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Send,
  X,
  Maximize2,
  Loader2,
  Sparkles,
  Zap,
  ChevronDown,
  AlertCircle,
  RefreshCw,
  Square,
} from "lucide-react";
import {
  type ChatConversation,
  type ChatMessage,
  getAllChats,
  saveChat,
  createNewChat,
  generateChatTitle,
} from "@/lib/chatStorage";
import { useLocation } from "wouter";

type AIProvider = "auto" | "orbitquick" | "orbitdeep" | "studyexpert";

interface ProviderInfo {
  id: string;
  name: string;
  available: boolean;
  mode?: string;
  strengths: string[];
}

const STREAM_IDLE_TIMEOUT_MS = 20000;

const providerIcons: Record<string, typeof Brain> = {
  orbitquick: Zap,
  orbitdeep: Brain,
  studyexpert: Sparkles,
};

const providerColors: Record<string, string> = {
  orbitquick: "text-amber-500",
  orbitdeep: "text-purple-500",
  studyexpert: "text-emerald-500",
};

export default function AIWidget() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>("auto");
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [lastMeta, setLastMeta] = useState<{ provider: string; model: string; taskType: string; mode?: string; routingReason?: string } | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerMenuRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: providers = [], refetch: refetchProviders, isFetching: providersLoading } = useQuery<ProviderInfo[]>({
    queryKey: ["/api/ai/providers"],
    enabled: isOpen,
  });

  const availableProviders = providers.filter((provider) => provider.available);
  const aiAvailable = availableProviders.length > 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (providerMenuRef.current && !providerMenuRef.current.contains(e.target as Node)) {
        setShowProviderMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (
      selectedProvider !== "auto" &&
      providers.length > 0 &&
      !providers.some((provider) => provider.id === selectedProvider && provider.available)
    ) {
      setSelectedProvider("auto");
    }
  }, [providers, selectedProvider]);

  const handleNewChat = () => {
    const chat = createNewChat();
    setActiveChat(chat);
    setLastMeta(null);
    setRequestError(null);
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
    let streamTimedOut = false;

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
      const readWithTimeout = () =>
        new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            streamTimedOut = true;
            abortController.abort();
            reject(new Error("STREAM_TIMEOUT"));
          }, STREAM_IDLE_TIMEOUT_MS);

          reader.read().then(
            (result) => {
              window.clearTimeout(timeout);
              resolve(result);
            },
            (readError) => {
              window.clearTimeout(timeout);
              reject(readError);
            },
          );
        });

      while (true) {
        const { done, value } = await readWithTimeout();
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
                  {
                    ...assistantMessage,
                    content: fullContent,
                  },
                ],
                updatedAt: Date.now(),
              };
              setActiveChat(workingChat);
            }
            if (event.error) {
              throw new Error(event.error);
            }
          } catch (parseError) {
            if (!(parseError instanceof SyntaxError)) throw parseError;
          }
        }
      }

      if (!fullContent.trim()) {
        throw new Error(t.ai.responseEmpty);
      }

      workingChat = {
        ...workingChat,
        updatedAt: Date.now(),
      };
      setActiveChat(workingChat);
      await saveChat(workingChat);
    } catch (error: any) {
      const wasAborted = abortController.signal.aborted;
      const message = streamTimedOut
        ? t.ai.responseFailed
        : wasAborted
          ? t.ai.generationStopped
          : error?.message || t.ai.responseFailed;

      const fallbackChat: ChatConversation = {
        ...workingChat,
        messages: fullContent.trim()
          ? [
              ...workingChat.messages.slice(0, -1),
              {
                ...assistantMessage,
                content: fullContent,
              },
            ]
          : workingChat.messages.slice(0, -1),
        updatedAt: Date.now(),
      };

      setActiveChat(fallbackChat);
      await saveChat(fallbackChat);
      setRequestError(message);

      toast({
        title: streamTimedOut ? t.ai.responseIssue : wasAborted ? t.ai.generationStoppedTitle : t.ai.responseIssue,
        description: message,
        variant: streamTimedOut || !wasAborted ? "destructive" : "default",
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
      chat = createNewChat();
    }

    const content = input.trim();
    const userMessage: ChatMessage = {
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const nextChat: ChatConversation = {
      ...chat,
      title: chat.messages.length === 0 ? generateChatTitle(content) : chat.title,
      messages: [...chat.messages, userMessage],
      updatedAt: Date.now(),
    };

    setActiveChat(nextChat);
    setInput("");
    await streamAssistantReply(nextChat);
  };

  const handleRetry = async () => {
    if (!activeChat || isLoading || !aiAvailable) return;
    const lastMessage = activeChat.messages[activeChat.messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") return;
    await streamAssistantReply({
      ...activeChat,
      updatedAt: Date.now(),
    });
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const getProviderIcon = (id: string) => {
    const Icon = providerIcons[id] || Brain;
    return Icon;
  };

  const getProviderLabel = (id: string) => {
    const labels: Record<string, string> = {
      auto: t.ai.autoRouting,
      orbitquick: t.ai.providerOrbitQuick,
      orbitdeep: t.ai.providerOrbitDeep,
      studyexpert: t.ai.providerStudyExpert,
      fast: t.ai.providerOrbitQuick,
      think: t.ai.providerOrbitDeep,
      expert: t.ai.providerStudyExpert,
    };
    return labels[id] || id;
  };

  const messages = activeChat?.messages || [];
  const canRetryLastTurn = Boolean(
    activeChat &&
    activeChat.messages.length > 0 &&
    activeChat.messages[activeChat.messages.length - 1]?.role === "user" &&
    !isLoading,
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 right-4 z-[60] w-[380px] max-w-[calc(100vw-2rem)] md:bottom-6 md:right-6"
            data-testid="ai-widget-panel"
          >
            <Card className="flex flex-col shadow-2xl border-primary/20 overflow-hidden h-[520px] max-h-[70vh]">
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{t.ai.widgetTitle}</p>
                    <p className="text-white/70 text-[10px]">{t.ai.widgetSubtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                    onClick={() => {
                      setIsOpen(false);
                      navigate("/ai");
                    }}
                    data-testid="button-open-full-ai"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                    onClick={() => setIsOpen(false)}
                    data-testid="button-close-widget"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="px-3 py-1.5 border-b bg-muted/30 flex items-center justify-between gap-2">
                <div className="relative" ref={providerMenuRef}>
                  <button
                    onClick={() => setShowProviderMenu(!showProviderMenu)}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md hover:bg-muted transition-colors"
                    data-testid="button-provider-select"
                  >
                    {selectedProvider === "auto" ? (
                      <Sparkles className="w-3 h-3 text-primary" />
                    ) : (
                      (() => {
                        const Icon = getProviderIcon(selectedProvider);
                        return <Icon className={`w-3 h-3 ${providerColors[selectedProvider] || ""}`} />;
                      })()
                    )}
                    <span className="font-medium">{getProviderLabel(selectedProvider)}</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>

                  <AnimatePresence>
                    {showProviderMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-0 top-full mt-1 z-50 bg-popover border rounded-lg shadow-lg py-1 min-w-[200px]"
                      >
                        <button
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors ${
                            selectedProvider === "auto" ? "bg-primary/10 text-primary" : ""
                          }`}
                          onClick={() => {
                            setSelectedProvider("auto");
                            setShowProviderMenu(false);
                          }}
                          data-testid="option-provider-auto"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <div className="text-left">
                            <p className="font-medium">{t.ai.smartRouting}</p>
                            <p className="text-[10px] text-muted-foreground">{t.ai.smartRoutingDesc}</p>
                          </div>
                        </button>
                        {providers.map((p) => {
                          const Icon = getProviderIcon(p.id);
                          const desc = p.id === "orbitquick" ? t.ai.orbitQuickDesc :
                                       p.id === "orbitdeep" ? t.ai.orbitDeepDesc :
                                       p.id === "studyexpert" ? t.ai.studyExpertDesc : "";
                          return (
                            <button
                              key={p.id}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors ${
                                !p.available ? "opacity-40 cursor-not-allowed" : ""
                              } ${selectedProvider === p.id ? "bg-primary/10 text-primary" : ""}`}
                              onClick={() => {
                                if (p.available) {
                                  setSelectedProvider(p.id as AIProvider);
                                  setShowProviderMenu(false);
                                }
                              }}
                              disabled={!p.available}
                              data-testid={`option-provider-${p.id}`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${providerColors[p.id] || ""}`} />
                              <div className="text-left flex-1">
                                <p className="font-medium">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {!p.available ? t.ai.providerUnavailable : desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {lastMeta && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                    {(() => {
                      const Icon = getProviderIcon(lastMeta.provider);
                      return <Icon className={`w-2.5 h-2.5 ${providerColors[lastMeta.provider] || ""}`} />;
                    })()}
                    {getProviderLabel(lastMeta.mode || lastMeta.provider)}
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 p-3">
                {!aiAvailable && (
                  <div className="mb-3 rounded-2xl border border-amber-500/25 bg-amber-500/8 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{t.ai.unavailableTitle}</p>
                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                          {t.ai.unavailableDescription}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-xl px-2 text-[10px]"
                        onClick={() => refetchProviders()}
                        disabled={providersLoading}
                        data-testid="button-widget-retry-providers"
                      >
                        <RefreshCw className={`mr-1 h-3 w-3 ${providersLoading ? "animate-spin" : ""}`} />
                        {t.ai.retry}
                      </Button>
                    </div>
                  </div>
                )}

                {requestError && (
                  <div className="mb-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{t.ai.responseIssue}</p>
                        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{requestError}</p>
                      </div>
                      {canRetryLastTurn && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-xl px-2 text-[10px]"
                          onClick={handleRetry}
                          data-testid="button-widget-retry-request"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" />
                          {t.ai.retry}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-3">
                      <Brain className={`w-7 h-7 ${aiAvailable ? "text-primary" : "text-amber-500"}`} />
                    </div>
                    <p className="font-semibold text-sm mb-1">{aiAvailable ? t.ai.widgetTitle : t.ai.unavailableTitle}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {aiAvailable ? t.ai.widgetSubtitle : t.ai.unavailableDescription}
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {[
                        { label: t.ai.explainSimply, q: "Explain quantum physics simply" },
                        { label: t.ai.makeMCQ, q: "Create 5 MCQ on photosynthesis" },
                        { label: t.ai.makeNotes, q: "Make revision notes on Newton's laws" },
                      ].map((item) => (
                        <Badge
                          key={item.label}
                          variant="secondary"
                          className={`text-[10px] py-1 px-2 transition-colors ${
                            aiAvailable ? "cursor-pointer hover:bg-primary/10" : "cursor-not-allowed opacity-60"
                          }`}
                          onClick={() => {
                            if (aiAvailable) {
                              setInput(item.q);
                            }
                          }}
                          data-testid={`widget-quick-${item.label.replace(/\s/g, "-").toLowerCase()}`}
                        >
                          {item.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          }`}
                          data-testid={`widget-msg-${msg.role}-${i}`}
                        >
                          {msg.role === "assistant" ? (
                            <AIMarkdown content={msg.content} variant="widget" />
                          ) : (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.content === "" && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-1.5">
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                          <span className="text-[10px] text-muted-foreground">{t.ai.thinking}</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="p-2 border-t bg-background">
                <div className="flex items-end gap-1.5">
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
                    placeholder={aiAvailable ? t.ai.widgetPlaceholder : t.ai.unavailableInputPlaceholder}
                    className="resize-none min-h-[36px] max-h-[80px] text-xs rounded-xl bg-muted/50 border-transparent focus:border-primary/30"
                    rows={1}
                    disabled={!aiAvailable}
                    data-testid="widget-textarea"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 flex-shrink-0"
                    onClick={isLoading ? handleStop : handleSend}
                    disabled={(!input.trim() && !isLoading) || (!aiAvailable && !isLoading)}
                    data-testid="widget-send"
                  >
                    {isLoading ? (
                      <Square className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!activeChat) handleNewChat();
        }}
        className="fixed bottom-20 right-4 z-[55] md:bottom-6 md:right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-indigo-500/40 transition-all duration-300 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-ai-widget"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronDown className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Brain className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
        )}
      </motion.button>
    </>
  );
}
