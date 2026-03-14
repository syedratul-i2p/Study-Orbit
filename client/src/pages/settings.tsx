import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/languageContext";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Palette, Brain, Database, HardDrive, Cloud,
  Download, Loader2, Archive, Calendar, RotateCcw,
  Shield, MessageSquare, Trash2, Upload,
  CheckCircle2, AlertTriangle, X, Timer,
  Share2, FileUp, FileDown, Sparkles, Lock, Unlock,
  ChevronDown, ChevronRight, RefreshCw, Copy,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  type BackupSnapshot,
  listSnapshots,
  createSnapshot,
  deleteSnapshot,
  restoreSnapshot,
  downloadBackupFile,
  shareBackupFile,
  canShare,
  parseBackupFile,
  importBackupFile,
  requestPersistentStorage,
  isPersisted,
  getStorageEstimate,
  formatBytes,
  startAutoSnapshots,
} from "@/lib/backupManager";

interface BackupItem {
  id: number;
  createdAt: string;
  messageCount: number;
  conversationCount: number;
}

function RestoreModal({ open, onClose, snapshot, t, onComplete }: {
  open: boolean;
  onClose: () => void;
  snapshot: BackupSnapshot | null;
  t: any;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"replace" | "merge" | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  if (!open || !snapshot) return null;

  const date = new Date(snapshot.createdAt);
  const dateStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleRestore = async (selectedMode: "replace" | "merge") => {
    setMode(selectedMode);
    setIsRestoring(true);
    try {
      const result = await restoreSnapshot(snapshot, selectedMode);
      toast({
        title: t.backup.backupRestored,
        description: `${result.restoredChats} ${t.backup.restoredCount}, ${result.skippedChats} ${t.backup.skippedCount}`,
      });
      onComplete();
      onClose();
    } catch {
      toast({ title: t.common?.error || "Error", variant: "destructive" });
    } finally {
      setIsRestoring(false);
      setMode(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{t.backup.restoreConfirm}</h3>
              <p className="text-xs text-muted-foreground">{t.backup.restoreConfirmDesc}</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.backup.createdOn}</span>
              <span className="font-medium">{dateStr}, {timeStr}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.backup.aiChats}</span>
              <span className="font-medium">{snapshot.stats.aiChatCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.backup.messageCount}</span>
              <span className="font-medium">{snapshot.stats.totalMessages}</span>
            </div>
          </div>

          <p className="text-sm font-medium mb-3">{t.backup.restoreMode}</p>
          <div className="space-y-3">
            <button
              onClick={() => handleRestore("replace")}
              disabled={isRestoring}
              className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-red-300 dark:hover:border-red-700 bg-red-50/50 dark:bg-red-950/20 transition-all group"
              data-testid="button-restore-replace"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 group-hover:scale-105 transition-transform">
                  <RefreshCw className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t.backup.replaceData}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.backup.replaceDesc}</p>
                </div>
                {isRestoring && mode === "replace" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            <button
              onClick={() => handleRestore("merge")}
              disabled={isRestoring}
              className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-green-300 dark:hover:border-green-700 bg-green-50/50 dark:bg-green-950/20 transition-all group"
              data-testid="button-restore-merge"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40 group-hover:scale-105 transition-transform">
                  <Copy className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{t.backup.mergeData}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.backup.mergeDesc}</p>
                </div>
                {isRestoring && mode === "merge" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </div>
        </div>

        <div className="border-t px-6 py-4 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isRestoring} className="w-full" data-testid="button-restore-cancel">
            <X className="w-4 h-4 mr-1" />
            {t.common?.cancel || "Cancel"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmText, cancelText, variant, isPending }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant: "restore" | "delete";
  isPending: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background border rounded-xl shadow-xl p-6 max-w-sm mx-4 w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-full ${variant === "delete" ? "bg-red-100 dark:bg-red-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
            {variant === "delete" ? (
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5 ml-[52px]">{description}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending} data-testid="button-confirm-cancel">
            <X className="w-4 h-4 mr-1" />
            {cancelText}
          </Button>
          <Button
            size="sm"
            variant={variant === "delete" ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={isPending}
            data-testid="button-confirm-action"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
            {confirmText}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function SnapshotCard({ snapshot, onRestore, onDelete, t }: {
  snapshot: BackupSnapshot;
  onRestore: () => void;
  onDelete: () => void;
  t: any;
}) {
  const date = new Date(snapshot.createdAt);
  const isToday = new Date().toDateString() === date.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = isToday
    ? `${t.backup.today}, ${timeStr}`
    : `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${timeStr}`;
  const isAuto = snapshot.type === "auto";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="group relative border rounded-xl p-3.5 hover:border-primary/30 transition-all duration-200 bg-card hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg flex-shrink-0 ${isAuto ? "bg-amber-100 dark:bg-amber-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
            {isAuto ? (
              <Timer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{snapshot.label}</p>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isAuto ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"}`}>
                {isAuto ? t.backup.autoSnapshot : t.backup.manualBackup}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {snapshot.stats.aiChatCount} {t.backup.aiChats}
              </span>
              <span>{snapshot.stats.totalMessages} {t.backup.messageCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={onRestore}
          data-testid={`button-restore-snapshot-${snapshot.id}`}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          {t.backup.restore}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500"
          onClick={onDelete}
          data-testid={`button-delete-snapshot-${snapshot.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<BackupSnapshot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState(false);
  const [showAllSnapshots, setShowAllSnapshots] = useState(false);
  const [importing, setImporting] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);
  const [shareAvailable] = useState(() => canShare());

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "restore" | "delete";
    backupId: number | null;
  }>({ open: false, type: "restore", backupId: null });

  const { data: backups = [], isLoading: backupsLoading } = useQuery<BackupItem[]>({ queryKey: ["/api/backup/list"] });

  const createBackup = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/backup/create", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup/list"] });
      toast({ title: t.backup.backupCreated, description: t.backup.includesAll });
    },
    onError: () => toast({ title: t.common.error, variant: "destructive" }),
  });

  const restoreBackup = useMutation({
    mutationFn: async (backupId: number) => {
      const res = await apiRequest("POST", `/api/backup/${backupId}/restore`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setConfirmDialog({ open: false, type: "restore", backupId: null });
      toast({
        title: t.backup.backupRestored,
        description: `${data.restored} ${t.backup.restoredCount}, ${data.skipped} ${t.backup.skippedCount}`,
      });
    },
    onError: () => {
      setConfirmDialog({ open: false, type: "restore", backupId: null });
      toast({ title: t.common.error, variant: "destructive" });
    },
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: number) => {
      const res = await apiRequest("DELETE", `/api/backup/${backupId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backup/list"] });
      setConfirmDialog({ open: false, type: "delete", backupId: null });
      toast({ title: t.backup.backupDeleted });
    },
    onError: () => {
      setConfirmDialog({ open: false, type: "delete", backupId: null });
      toast({ title: t.common.error, variant: "destructive" });
    },
  });

  const handleDownload = (backupId: number) => {
    window.open(`/api/backup/${backupId}/download`, "_blank");
  };

  const handleConfirm = () => {
    if (!confirmDialog.backupId) return;
    if (confirmDialog.type === "restore") {
      restoreBackup.mutate(confirmDialog.backupId);
    } else {
      deleteBackupMutation.mutate(confirmDialog.backupId);
    }
  };

  const loadSnapshots = useCallback(async () => {
    try {
      const list = await listSnapshots();
      setSnapshots(list);
    } catch {
    } finally {
      setLoadingSnapshots(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots();
    startAutoSnapshots();
    isPersisted().then(setPersisted);
    getStorageEstimate().then(setStorageInfo);
  }, [loadSnapshots]);

  const handleCreateSnapshot = async () => {
    setCreatingSnapshot(true);
    try {
      await createSnapshot("manual", t.backup.manualBackup);
      await loadSnapshots();
      toast({ title: t.backup.backupCreated });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setCreatingSnapshot(false);
    }
  };

  const handleDeleteSnapshot = async () => {
    if (!deleteTarget) return;
    setDeletingSnapshot(true);
    try {
      await deleteSnapshot(deleteTarget);
      await loadSnapshots();
      toast({ title: t.backup.backupDeleted });
    } catch {
      toast({ title: t.common.error, variant: "destructive" });
    } finally {
      setDeletingSnapshot(false);
      setDeleteTarget(null);
    }
  };

  const handleExport = () => {
    if (snapshots.length === 0) return;
    downloadBackupFile(snapshots);
    toast({ title: t.backup.exportSuccess });
  };

  const handleShare = async () => {
    if (snapshots.length === 0) return;
    const shared = await shareBackupFile(snapshots);
    toast({
      title: shared ? t.backup.shareSuccess : t.backup.shareFailed,
      variant: shared ? "default" : "destructive",
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseBackupFile(text);
      const result = await importBackupFile(parsed, "merge");
      await loadSnapshots();
      toast({
        title: t.backup.importSuccess,
        description: `${result.imported} ${t.backup.importedCount}, ${result.skipped} ${t.backup.skippedSnapshots}`,
      });
    } catch {
      toast({ title: t.backup.importFailed, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRequestPersistent = async () => {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    if (granted) {
      toast({ title: t.backup.persistentEnabled });
    }
  };

  const visibleSnapshots = showAllSnapshots ? snapshots : snapshots.slice(0, 3);

  return (
    <div className="app-page-narrow space-y-6">
      <PageHeader
        badge={
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Preferences
          </>
        }
        icon={<Globe className="h-6 w-6 text-primary" />}
        title={t.settings.title}
        description="Adjust language, theme, storage, and backup controls without leaving the study workspace."
      >
        <div className="flex flex-wrap gap-3">
          <div className="app-panel min-w-[8.5rem]">
            <p className="text-xs font-medium text-muted-foreground">App language</p>
            <p className="mt-1 text-sm font-semibold">{language === "bn" ? "Bangla" : "English"}</p>
          </div>
          <div className="app-panel min-w-[8.5rem]">
            <p className="text-xs font-medium text-muted-foreground">Theme</p>
            <p className="mt-1 text-sm font-semibold capitalize">{theme}</p>
          </div>
        </div>
      </PageHeader>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="app-surface p-5">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">{t.settings.language}</h2>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">{t.onboarding.appLanguage}</Label>
              <Select
                value={language}
                onValueChange={(v) => {
                  setLanguage(v as "en" | "bn");
                  updateProfile({ appLanguage: v } as any);
                }}
              >
                <SelectTrigger data-testid="select-settings-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">?????</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="app-surface p-5">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold">{t.settings.chatLanguage}</h2>
          </div>
          <Select
            value={user?.chatLanguage || "auto"}
            onValueChange={(v) => updateProfile({ chatLanguage: v } as any)}
          >
            <SelectTrigger data-testid="select-chat-lang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t.settings.auto}</SelectItem>
              <SelectItem value="bn">{t.settings.bangla}</SelectItem>
              <SelectItem value="en">{t.settings.english}</SelectItem>
              <SelectItem value="bilingual">{t.settings.bilingual}</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <Card className="app-surface p-5">
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold">{t.settings.theme}</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "secondary"}
              size="sm"
              onClick={() => setTheme("light")}
              data-testid="button-theme-light"
            >
              {t.settings.light}
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "secondary"}
              size="sm"
              onClick={() => setTheme("dark")}
              data-testid="button-theme-dark"
            >
              {t.settings.dark}
            </Button>
          </div>
        </Card>

        <Card className="app-surface p-5">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold">{t.settings.dataStorage}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <HardDrive className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.settings.localData}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings.localDescription}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
              <Cloud className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">{t.settings.cloudData}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.settings.cloudDescription}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="app-surface overflow-hidden p-5" data-testid="card-backup-section">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">{t.backup.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t.backup.subtitle}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{t.backup.autoEnabled}</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{t.backup.autoDesc}</p>
            </div>
          </div>

          {!persisted && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Unlock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{t.backup.protectData}</p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">{t.backup.protectDesc}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 dark:border-amber-700 shrink-0"
                onClick={handleRequestPersistent}
                data-testid="button-request-persistent"
              >
                <Lock className="w-3 h-3 mr-1" />
                {t.backup.requestPersistent}
              </Button>
            </div>
          )}

          {persisted && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300">{t.backup.persistentStorage}</p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">{t.backup.persistentEnabled}</p>
              </div>
              {storageInfo && (
                <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full shrink-0">
                  {formatBytes(storageInfo.used)}
                </span>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              onClick={handleCreateSnapshot}
              disabled={creatingSnapshot}
              size="sm"
              className="gap-1.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-sm"
              data-testid="button-create-snapshot"
            >
              {creatingSnapshot ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              {t.backup.createManual}
            </Button>

            <Button
              onClick={handleExport}
              disabled={snapshots.length === 0}
              size="sm"
              variant="outline"
              className="gap-1.5"
              data-testid="button-export-backup"
            >
              <FileDown className="w-4 h-4" />
              {t.backup.exportFile}
            </Button>

            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              size="sm"
              variant="outline"
              className="gap-1.5"
              data-testid="button-import-backup"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              {t.backup.importFile}
            </Button>

            {shareAvailable && (
              <Button
                onClick={handleShare}
                disabled={snapshots.length === 0}
                size="sm"
                variant="outline"
                className="gap-1.5"
                data-testid="button-share-backup"
              >
                <Share2 className="w-4 h-4" />
                {t.backup.shareBackup}
              </Button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
              data-testid="input-import-file"
            />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Archive className="w-4 h-4 text-muted-foreground" />
                {t.backup.localSnapshots}
              </h3>
              {snapshots.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {snapshots.length} {t.backup.snapshotCount}
                </span>
              )}
            </div>

            {loadingSnapshots ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">{t.backup.loadingBackups}</p>
              </div>
            ) : snapshots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 border border-dashed rounded-xl" data-testid="text-no-snapshots">
                <div className="p-3 rounded-full bg-muted">
                  <Archive className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">{t.backup.noBackups}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.backup.noBackupsDesc}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {visibleSnapshots.map((snap) => (
                      <SnapshotCard
                        key={snap.id}
                        snapshot={snap}
                        onRestore={() => setRestoreTarget(snap)}
                        onDelete={() => setDeleteTarget(snap.id)}
                        t={t}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                {snapshots.length > 3 && (
                  <button
                    onClick={() => setShowAllSnapshots(!showAllSnapshots)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    data-testid="button-toggle-snapshots"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllSnapshots ? "rotate-180" : ""}`} />
                    {showAllSnapshots ? "▲" : `${snapshots.length} ${t.backup.snapshotCount} ▼`}
                  </button>
                )}
              </>
            )}
          </div>

          {(backups as BackupItem[]).length > 0 && (
            <div className="mt-5 pt-5 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-muted-foreground" />
                  {t.backup.serverBackup}
                </h3>
                <Button
                  onClick={() => createBackup.mutate()}
                  disabled={createBackup.isPending}
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  data-testid="button-create-server-backup"
                >
                  {createBackup.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {t.backup.backupNow}
                </Button>
              </div>
              <div className="space-y-2.5">
                {(backups as BackupItem[]).map((backup) => {
                  const date = new Date(backup.createdAt);
                  const isToday = new Date().toDateString() === date.toDateString();
                  const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const dateStr = isToday ? `${t.backup.today}, ${timeStr}` : `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${timeStr}`;
                  return (
                    <div key={backup.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:border-primary/20 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Cloud className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{dateStr}</p>
                          <p className="text-xs text-muted-foreground">
                            {backup.messageCount} {t.backup.messageCount} · {backup.conversationCount} {t.backup.conversations}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setConfirmDialog({ open: true, type: "restore", backupId: backup.id })} data-testid={`button-restore-backup-${backup.id}`}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleDownload(backup.id)} data-testid={`button-download-backup-${backup.id}`}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500" onClick={() => setConfirmDialog({ open: true, type: "delete", backupId: backup.id })} data-testid={`button-delete-backup-${backup.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(backups as BackupItem[]).length === 0 && (
            <div className="mt-5 pt-5 border-t">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-muted-foreground" />
                  {t.backup.serverBackup}
                </h3>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
                <div className="flex items-center gap-2.5">
                  <Upload className="w-4 h-4 text-primary" />
                  <p className="text-sm text-muted-foreground">{t.backup.includesAll}</p>
                </div>
                <Button
                  onClick={() => createBackup.mutate()}
                  disabled={createBackup.isPending}
                  size="sm"
                  className="gap-1.5"
                  data-testid="button-create-backup"
                >
                  {createBackup.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {t.backup.backupNow}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      <RestoreModal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        snapshot={restoreTarget}
        t={t}
        onComplete={loadSnapshots}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSnapshot}
        title={t.backup.deleteConfirm}
        description={t.backup.deleteConfirmDesc}
        confirmText={t.backup.delete}
        cancelText={t.common.cancel}
        variant="delete"
        isPending={deletingSnapshot}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: "restore", backupId: null })}
        onConfirm={handleConfirm}
        title={confirmDialog.type === "delete" ? t.backup.deleteConfirm : t.backup.restoreConfirm}
        description={confirmDialog.type === "delete" ? t.backup.deleteConfirmDesc : t.backup.restoreConfirmDesc}
        confirmText={confirmDialog.type === "delete" ? t.backup.delete : t.backup.restore}
        cancelText={t.common.cancel}
        variant={confirmDialog.type}
        isPending={confirmDialog.type === "delete" ? deleteBackupMutation.isPending : restoreBackup.isPending}
      />
    </div>
  );
}

