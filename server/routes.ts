import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, requireAuth, getCurrentUser } from "./auth";
import { streamAIResponse, type ChatMessage, getAvailableProviders, type AIProvider } from "./ai-providers";
import { registerSchema, loginSchema, onboardingSchema, insertSubjectSchema, insertTopicSchema, insertPlannerItemSchema, insertFocusSessionSchema, insertFeedbackSchema } from "@shared/schema";
import session from "express-session";
import memorystore from "memorystore";
import multer from "multer";
import path from "path";
import fs from "fs";
import { setupWebSocket, sendToUser, isUserOnline, getOnlineUserIds } from "./websocket";

const MemoryStore = memorystore(session);

function getParamId(req: Request): number {
  return parseInt(req.params.id as string, 10);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({ checkPeriod: 86400000 }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  });

  app.use(sessionMiddleware);

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) return res.status(400).json({ message: "Email already registered" });
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) return res.status(400).json({ message: "Username already taken" });
      const hashedPassword = await hashPassword(data.password);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      const valid = await comparePassword(data.password, user.password);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  app.post("/api/auth/send-code", async (req: Request, res: Response) => {
    try {
      const { email, type } = req.body;
      if (!email || !type) return res.status(400).json({ message: "Email and type required" });
      if (!["login", "reset"].includes(type)) return res.status(400).json({ message: "Invalid type" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "No account found with this email" });

      const code = generateCode();
      await storage.createVerificationCode(email, code, type);

      res.json({ message: "Verification code sent", codeSentTo: email, _devCode: process.env.NODE_ENV === "development" ? code : undefined });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-login", async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ message: "Email and code required" });

      const valid = await storage.verifyCode(email, code, "login");
      if (!valid) return res.status(401).json({ message: "Invalid or expired code" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found" });

      req.session.userId = user.id;
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-code", async (req: Request, res: Response) => {
    try {
      const { email, code, type } = req.body;
      if (!email || !code || !type) return res.status(400).json({ message: "All fields required" });

      const valid = await storage.verifyCode(email, code, type);
      if (!valid) return res.status(401).json({ message: "Invalid or expired code" });

      const newCode = generateCode();
      await storage.createVerificationCode(email, newCode, `${type}_verified`);
      res.json({ message: "Code verified", _resetToken: newCode });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) return res.status(400).json({ message: "All fields required" });
      if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      const valid = await storage.verifyCode(email, code, "reset_verified");
      if (!valid) return res.status(401).json({ message: "Invalid or expired reset token" });

      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found" });

      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedPassword);
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    res.json(user);
  });

  app.patch("/api/auth/onboarding", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = onboardingSchema.parse(req.body);
      const user = await storage.updateUser(req.session.userId!, {
        ...data,
        onboardingComplete: true,
      });
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Update failed" });
    }
  });

  app.patch("/api/user/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.updateUser(req.session.userId!, req.body);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Update failed" });
    }
  });

  app.get("/api/subjects", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getSubjects(req.session.userId!);
    res.json(items);
  });

  app.post("/api/subjects", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertSubjectSchema.parse({ ...req.body, userId: req.session.userId! });
      const item = await storage.createSubject(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create subject" });
    }
  });

  app.patch("/api/subjects/:id", requireAuth, async (req: Request, res: Response) => {
    const id = getParamId(req);
    const existing = await storage.getSubject(id);
    if (!existing || existing.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Not found" });
    }
    const item = await storage.updateSubject(id, req.body);
    res.json(item);
  });

  app.delete("/api/subjects/:id", requireAuth, async (req: Request, res: Response) => {
    const id = getParamId(req);
    const existing = await storage.getSubject(id);
    if (!existing || existing.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Not found" });
    }
    await storage.deleteSubject(id);
    res.json({ message: "Deleted" });
  });

  app.get("/api/subjects/:id/topics", requireAuth, async (req: Request, res: Response) => {
    const id = getParamId(req);
    const subject = await storage.getSubject(id);
    if (!subject || subject.userId !== req.session.userId!) {
      return res.status(404).json({ message: "Not found" });
    }
    const items = await storage.getTopics(id);
    res.json(items);
  });

  app.get("/api/topics", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getTopicsByUser(req.session.userId!);
    res.json(items);
  });

  app.post("/api/topics", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertTopicSchema.parse({ ...req.body, userId: req.session.userId! });
      const item = await storage.createTopic(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create topic" });
    }
  });

  app.patch("/api/topics/:id", requireAuth, async (req: Request, res: Response) => {
    const id = getParamId(req);
    const topics = await storage.getTopicsByUser(req.session.userId!);
    const existing = topics.find(t => t.id === id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const item = await storage.updateTopic(id, req.body);
    res.json(item);
  });

  app.delete("/api/topics/:id", requireAuth, async (req: Request, res: Response) => {
    const id = getParamId(req);
    const topics = await storage.getTopicsByUser(req.session.userId!);
    const existing = topics.find(t => t.id === id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deleteTopic(id);
    res.json({ message: "Deleted" });
  });

  app.get("/api/planner", requireAuth, async (req: Request, res: Response) => {
    const { from, to } = req.query;
    const items = await storage.getPlannerItems(
      req.session.userId!,
      from as string,
      to as string
    );
    res.json(items);
  });

  app.post("/api/planner", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertPlannerItemSchema.parse({ ...req.body, userId: req.session.userId! });
      const item = await storage.createPlannerItem(data);
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create planner item" });
    }
  });

  app.patch("/api/planner/:id", requireAuth, async (req: Request, res: Response) => {
    const id = getParamId(req);
    const allItems = await storage.getPlannerItems(req.session.userId!);
    const existing = allItems.find(i => i.id === id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    const item = await storage.updatePlannerItem(id, req.body);
    res.json(item);
  });

  app.delete("/api/planner/:id", requireAuth, async (req: Request, res: Response) => {
    const id = getParamId(req);
    const allItems = await storage.getPlannerItems(req.session.userId!);
    const existing = allItems.find(i => i.id === id);
    if (!existing) return res.status(404).json({ message: "Not found" });
    await storage.deletePlannerItem(id);
    res.json({ message: "Deleted" });
  });

  app.get("/api/focus-sessions", requireAuth, async (req: Request, res: Response) => {
    const items = await storage.getFocusSessions(req.session.userId!);
    res.json(items);
  });

  app.post("/api/focus-sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const data = insertFocusSessionSchema.parse({ ...req.body, userId: req.session.userId! });
      const focusSession = await storage.createFocusSession(data);
      const today = new Date().toISOString().split("T")[0];
      await storage.createOrUpdateProgressLog({
        userId: req.session.userId!,
        date: today,
        totalMinutes: data.duration,
        sessionsCompleted: 1,
      });
      res.json(focusSession);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to save session" });
    }
  });

  app.get("/api/progress", requireAuth, async (req: Request, res: Response) => {
    const { from, to } = req.query;
    const items = await storage.getProgressLogs(
      req.session.userId!,
      from as string,
      to as string
    );
    res.json(items);
  });

  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${Date.now()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, allowed.includes(ext));
    },
  });

  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadDir, path.basename(req.path));
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  app.post("/api/user/avatar", requireAuth, upload.single("avatar"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const avatarPath = `/uploads/${req.file.filename}`;
      const user = await storage.updateUser(req.session.userId!, { profilePicture: avatarPath } as any);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Upload failed" });
    }
  });

  app.get("/api/friends", requireAuth, async (req: Request, res: Response) => {
    try {
      const friendships = await storage.getFriends(req.session.userId!);
      const friends = [];
      for (const f of friendships) {
        const otherId = f.requesterId === req.session.userId! ? f.receiverId : f.requesterId;
        const user = await storage.getUser(otherId);
        if (user) {
          const { password, ...safeUser } = user;
          friends.push({ ...safeUser, friendshipId: f.id, online: isUserOnline(otherId) });
        }
      }
      res.json(friends);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/pending", requireAuth, async (req: Request, res: Response) => {
    try {
      const pending = await storage.getPendingRequests(req.session.userId!);
      const requests = [];
      for (const f of pending) {
        const user = await storage.getUser(f.requesterId);
        if (user) {
          const { password, ...safeUser } = user;
          requests.push({ ...safeUser, friendshipId: f.id });
        }
      }
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/friends/search", requireAuth, async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string) || "";
      if (q.length < 2) return res.json([]);
      const users = await storage.searchUsers(q, req.session.userId!);
      const results = [];
      for (const u of users) {
        const existing = await storage.getExistingFriendship(req.session.userId!, u.id);
        const { password, ...safeUser } = u;
        results.push({ ...safeUser, friendshipStatus: existing?.status || null, friendshipId: existing?.id || null });
      }
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/friends/request", requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId: receiverId } = req.body;
      if (!receiverId || typeof receiverId !== "number" || receiverId === req.session.userId!) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const receiver = await storage.getUser(receiverId);
      if (!receiver) return res.status(404).json({ message: "User not found" });
      const existing = await storage.getExistingFriendship(req.session.userId!, receiverId);
      if (existing) return res.status(400).json({ message: "Friend request already exists" });
      const friendship = await storage.sendFriendRequest(req.session.userId!, receiverId);
      sendToUser(receiverId, { type: "friend_request", friendship });
      res.json(friendship);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends/accept/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req);
      const friendship = await storage.getFriendship(id);
      if (!friendship || friendship.receiverId !== req.session.userId!) {
        return res.status(404).json({ message: "Not found" });
      }
      const updated = await storage.acceptFriendRequest(id);
      sendToUser(friendship.requesterId, { type: "friend_accepted", friendship: updated });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/friends/reject/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req);
      const friendship = await storage.getFriendship(id);
      if (!friendship || friendship.receiverId !== req.session.userId!) {
        return res.status(404).json({ message: "Not found" });
      }
      await storage.rejectFriendRequest(id);
      res.json({ message: "Rejected" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/friends/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req);
      const friendship = await storage.getFriendship(id);
      if (!friendship) return res.status(404).json({ message: "Not found" });
      if (friendship.requesterId !== req.session.userId! && friendship.receiverId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.removeFriend(id);
      res.json({ message: "Removed" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/messages/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations(req.session.userId!);
      const safe = conversations.map(c => {
        const { password, ...safeUser } = c.user;
        return { user: { ...safeUser, online: isUserOnline(c.user.id) }, lastMessage: c.lastMessage, unreadCount: c.unreadCount };
      });
      res.json(safe);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages/unread", requireAuth, async (req: Request, res: Response) => {
    try {
      const count = await storage.getUnreadCount(req.session.userId!);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/messages/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const otherUserId = parseInt(req.params.userId as string, 10);
      if (isNaN(otherUserId)) return res.status(400).json({ message: "Invalid user ID" });
      const friendship = await storage.getExistingFriendship(req.session.userId!, otherUserId);
      if (!friendship || friendship.status !== "accepted") {
        return res.status(403).json({ message: "You can only message friends" });
      }
      const messages = await storage.getDirectMessages(req.session.userId!, otherUserId);
      await storage.markMessagesAsRead(otherUserId, req.session.userId!);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/messages/:userId", requireAuth, async (req: Request, res: Response) => {
    try {
      const receiverId = parseInt(req.params.userId as string, 10);
      if (isNaN(receiverId)) return res.status(400).json({ message: "Invalid user ID" });
      const friendship = await storage.getExistingFriendship(req.session.userId!, receiverId);
      if (!friendship || friendship.status !== "accepted") {
        return res.status(403).json({ message: "You can only message friends" });
      }
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ message: "Message cannot be empty" });
      const message = await storage.sendDirectMessage({
        senderId: req.session.userId!,
        receiverId,
        content: content.trim(),
      });
      sendToUser(receiverId, { type: "new_message", message });
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/online-users", requireAuth, async (req: Request, res: Response) => {
    res.json(getOnlineUserIds());
  });

  app.post("/api/backup/create", requireAuth, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getAllUserMessages(req.session.userId!);
      const backup = await storage.createChatBackup({
        userId: req.session.userId!,
        data: messages,
      });
      res.json(backup);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/backup/list", requireAuth, async (req: Request, res: Response) => {
    try {
      const backups = await storage.getChatBackups(req.session.userId!);
      res.json(backups.map(b => {
        const msgs = Array.isArray(b.data) ? b.data as any[] : [];
        const uniquePartners = new Set(msgs.map((m: any) => m.senderId === req.session.userId ? m.receiverId : m.senderId));
        return {
          id: b.id,
          createdAt: b.createdAt,
          messageCount: msgs.length,
          conversationCount: uniquePartners.size,
        };
      }));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/backup/:id/download", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req);
      const backup = await storage.getChatBackup(id);
      if (!backup || backup.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Not found" });
      }
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=study-orbit-backup-${backup.id}.json`);
      res.json(backup.data);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/backup/:id/restore", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req);
      const backup = await storage.getChatBackup(id);
      if (!backup || backup.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Not found" });
      }
      const messages = backup.data as any[];
      if (!Array.isArray(messages)) {
        return res.status(400).json({ message: "Invalid backup data" });
      }
      const existingMessages = await storage.getAllUserMessages(req.session.userId!);
      const existingSet = new Set(
        existingMessages.map(m => `${m.senderId}-${m.receiverId}-${m.content}`)
      );
      let restoredCount = 0;
      let skippedCount = 0;
      for (const msg of messages) {
        if (msg.senderId && msg.receiverId && msg.content) {
          if (msg.senderId === req.session.userId || msg.receiverId === req.session.userId) {
            const fingerprint = `${msg.senderId}-${msg.receiverId}-${msg.content}`;
            if (existingSet.has(fingerprint)) {
              skippedCount++;
              continue;
            }
            try {
              await storage.sendDirectMessage({
                senderId: msg.senderId,
                receiverId: msg.receiverId,
                content: msg.content,
                read: msg.read ?? true,
              });
              existingSet.add(fingerprint);
              restoredCount++;
            } catch {}
          }
        }
      }
      res.json({ restored: restoredCount, skipped: skippedCount, total: messages.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/backup/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = getParamId(req);
      const backup = await storage.getChatBackup(id);
      if (!backup || backup.userId !== req.session.userId!) {
        return res.status(404).json({ message: "Not found" });
      }
      await storage.deleteChatBackup(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/feedback", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const data = insertFeedbackSchema.parse({ ...req.body, userId });
      if (!["suggestion", "bug", "general"].includes(data.type)) {
        return res.status(400).json({ message: "Invalid feedback type" });
      }
      if (!data.message || data.message.trim().length === 0) {
        return res.status(400).json({ message: "Message is required" });
      }
      if (data.message.length > 500) {
        return res.status(400).json({ message: "Message too long" });
      }
      if (data.rating !== null && data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      const result = await storage.createFeedback(data);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/feedback", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const feedbackList = await storage.getFeedbackByUser(userId);
      res.json(feedbackList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  setupWebSocket(httpServer, sessionMiddleware);

  let aiRequestCount = 0;
  let aiRequestResetTime = Date.now();

  app.get("/api/ai/providers", requireAuth, async (_req: Request, res: Response) => {
    const providers = getAvailableProviders();
    res.json(providers.map(p => ({
      id: p.id,
      name: p.name,
      available: p.available,
      strengths: p.strengths,
    })));
  });

  app.post("/api/ai/chat", requireAuth, async (req: Request, res: Response) => {
    try {
      if (Date.now() - aiRequestResetTime > 60000) {
        aiRequestCount = 0;
        aiRequestResetTime = Date.now();
      }
      aiRequestCount++;
      if (aiRequestCount > 20) {
        return res.status(429).json({ message: "Too many requests. Please wait a moment." });
      }

      const { messages, userContext, provider } = req.body as {
        messages: ChatMessage[];
        userContext?: any;
        provider?: AIProvider;
      };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Messages are required" });
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const result = await streamAIResponse(messages, userContext, provider);

      res.write(`data: ${JSON.stringify({ meta: { provider: result.provider, model: result.model, taskType: result.taskType } })}\n\n`);

      for await (const chunk of result.stream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("AI error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "AI service temporarily unavailable." })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: "AI service temporarily unavailable. Please try again." });
      }
    }
  });

  return httpServer;
}
