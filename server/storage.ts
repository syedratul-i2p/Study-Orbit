import {
  type User, type InsertUser,
  type Subject, type InsertSubject,
  type Topic, type InsertTopic,
  type PlannerItem, type InsertPlannerItem,
  type FocusSession, type InsertFocusSession,
  type ProgressLog, type InsertProgressLog,
  type Friendship, type InsertFriendship,
  type DirectMessage, type InsertDirectMessage,
  type ChatBackup, type InsertChatBackup,
  type Feedback, type InsertFeedback,
  users, subjects, topics, plannerItems, focusSessions, progressLogs,
  friendships, directMessages, chatBackups, verificationCodes, feedback,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte, or, ilike, ne, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  getSubjects(userId: number): Promise<Subject[]>;
  getSubject(id: number): Promise<Subject | undefined>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject | undefined>;
  deleteSubject(id: number): Promise<void>;

  getTopics(subjectId: number): Promise<Topic[]>;
  getTopicsByUser(userId: number): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  updateTopic(id: number, data: Partial<InsertTopic>): Promise<Topic | undefined>;
  deleteTopic(id: number): Promise<void>;

  getPlannerItems(userId: number, dateFrom?: string, dateTo?: string): Promise<PlannerItem[]>;
  createPlannerItem(item: InsertPlannerItem): Promise<PlannerItem>;
  updatePlannerItem(id: number, data: Partial<InsertPlannerItem>): Promise<PlannerItem | undefined>;
  deletePlannerItem(id: number): Promise<void>;

  getFocusSessions(userId: number, limit?: number): Promise<FocusSession[]>;
  createFocusSession(session: InsertFocusSession): Promise<FocusSession>;

  getProgressLogs(userId: number, dateFrom?: string, dateTo?: string): Promise<ProgressLog[]>;
  createOrUpdateProgressLog(log: InsertProgressLog): Promise<ProgressLog>;

  sendFriendRequest(requesterId: number, receiverId: number): Promise<Friendship>;
  acceptFriendRequest(id: number): Promise<Friendship | undefined>;
  rejectFriendRequest(id: number): Promise<void>;
  removeFriend(id: number): Promise<void>;
  getFriends(userId: number): Promise<Friendship[]>;
  getPendingRequests(userId: number): Promise<Friendship[]>;
  getFriendship(id: number): Promise<Friendship | undefined>;
  getExistingFriendship(userId1: number, userId2: number): Promise<Friendship | undefined>;
  searchUsers(query: string, currentUserId: number): Promise<User[]>;

  sendDirectMessage(msg: InsertDirectMessage): Promise<DirectMessage>;
  getDirectMessages(userId1: number, userId2: number, limit?: number): Promise<DirectMessage[]>;
  getConversations(userId: number): Promise<{ user: User; lastMessage: DirectMessage; unreadCount: number }[]>;
  markMessagesAsRead(senderId: number, receiverId: number): Promise<void>;
  getUnreadCount(userId: number): Promise<number>;

  createChatBackup(backup: InsertChatBackup): Promise<ChatBackup>;
  getChatBackups(userId: number): Promise<ChatBackup[]>;
  getChatBackup(id: number): Promise<ChatBackup | undefined>;
  deleteChatBackup(id: number): Promise<void>;
  getAllUserMessages(userId: number): Promise<DirectMessage[]>;

  createVerificationCode(email: string, code: string, type: string): Promise<void>;
  verifyCode(email: string, code: string, type: string): Promise<boolean>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;

  createFeedback(data: InsertFeedback): Promise<Feedback>;
  getFeedbackByUser(userId: number): Promise<Feedback[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getSubjects(userId: number): Promise<Subject[]> {
    return db.select().from(subjects).where(eq(subjects.userId, userId));
  }

  async getSubject(id: number): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, id));
    return subject;
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [created] = await db.insert(subjects).values(subject).returning();
    return created;
  }

  async updateSubject(id: number, data: Partial<InsertSubject>): Promise<Subject | undefined> {
    const [updated] = await db.update(subjects).set(data).where(eq(subjects.id, id)).returning();
    return updated;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  async getTopics(subjectId: number): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.subjectId, subjectId));
  }

  async getTopicsByUser(userId: number): Promise<Topic[]> {
    return db.select().from(topics).where(eq(topics.userId, userId));
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [created] = await db.insert(topics).values(topic).returning();
    return created;
  }

  async updateTopic(id: number, data: Partial<InsertTopic>): Promise<Topic | undefined> {
    const [updated] = await db.update(topics).set(data).where(eq(topics.id, id)).returning();
    return updated;
  }

  async deleteTopic(id: number): Promise<void> {
    await db.delete(topics).where(eq(topics.id, id));
  }

  async getPlannerItems(userId: number, dateFrom?: string, dateTo?: string): Promise<PlannerItem[]> {
    let query = db.select().from(plannerItems).where(eq(plannerItems.userId, userId));
    if (dateFrom && dateTo) {
      query = db.select().from(plannerItems).where(
        and(
          eq(plannerItems.userId, userId),
          gte(plannerItems.date, dateFrom),
          lte(plannerItems.date, dateTo)
        )
      );
    }
    return query;
  }

  async createPlannerItem(item: InsertPlannerItem): Promise<PlannerItem> {
    const [created] = await db.insert(plannerItems).values(item).returning();
    return created;
  }

  async updatePlannerItem(id: number, data: Partial<InsertPlannerItem>): Promise<PlannerItem | undefined> {
    const [updated] = await db.update(plannerItems).set(data).where(eq(plannerItems.id, id)).returning();
    return updated;
  }

  async deletePlannerItem(id: number): Promise<void> {
    await db.delete(plannerItems).where(eq(plannerItems.id, id));
  }

  async getFocusSessions(userId: number, limit = 50): Promise<FocusSession[]> {
    return db.select().from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .orderBy(desc(focusSessions.completedAt))
      .limit(limit);
  }

  async createFocusSession(session: InsertFocusSession): Promise<FocusSession> {
    const [created] = await db.insert(focusSessions).values(session).returning();
    return created;
  }

  async getProgressLogs(userId: number, dateFrom?: string, dateTo?: string): Promise<ProgressLog[]> {
    if (dateFrom && dateTo) {
      return db.select().from(progressLogs).where(
        and(
          eq(progressLogs.userId, userId),
          gte(progressLogs.date, dateFrom),
          lte(progressLogs.date, dateTo)
        )
      );
    }
    return db.select().from(progressLogs).where(eq(progressLogs.userId, userId));
  }

  async createOrUpdateProgressLog(log: InsertProgressLog): Promise<ProgressLog> {
    const existing = await db.select().from(progressLogs).where(
      and(eq(progressLogs.userId, log.userId), eq(progressLogs.date, log.date))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(progressLogs)
        .set({
          totalMinutes: (existing[0].totalMinutes || 0) + (log.totalMinutes || 0),
          sessionsCompleted: (existing[0].sessionsCompleted || 0) + (log.sessionsCompleted || 0),
        })
        .where(eq(progressLogs.id, existing[0].id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(progressLogs).values(log).returning();
    return created;
  }

  async sendFriendRequest(requesterId: number, receiverId: number): Promise<Friendship> {
    const [friendship] = await db.insert(friendships).values({ requesterId, receiverId, status: "pending" }).returning();
    return friendship;
  }

  async acceptFriendRequest(id: number): Promise<Friendship | undefined> {
    const [updated] = await db.update(friendships).set({ status: "accepted" }).where(eq(friendships.id, id)).returning();
    return updated;
  }

  async rejectFriendRequest(id: number): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, id));
  }

  async removeFriend(id: number): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, id));
  }

  async getFriends(userId: number): Promise<Friendship[]> {
    return db.select().from(friendships).where(
      and(
        or(eq(friendships.requesterId, userId), eq(friendships.receiverId, userId)),
        eq(friendships.status, "accepted")
      )
    );
  }

  async getPendingRequests(userId: number): Promise<Friendship[]> {
    return db.select().from(friendships).where(
      and(eq(friendships.receiverId, userId), eq(friendships.status, "pending"))
    );
  }

  async getFriendship(id: number): Promise<Friendship | undefined> {
    const [f] = await db.select().from(friendships).where(eq(friendships.id, id));
    return f;
  }

  async getExistingFriendship(userId1: number, userId2: number): Promise<Friendship | undefined> {
    const [f] = await db.select().from(friendships).where(
      or(
        and(eq(friendships.requesterId, userId1), eq(friendships.receiverId, userId2)),
        and(eq(friendships.requesterId, userId2), eq(friendships.receiverId, userId1))
      )
    );
    return f;
  }

  async searchUsers(query: string, currentUserId: number): Promise<User[]> {
    return db.select().from(users).where(
      and(
        ne(users.id, currentUserId),
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.fullName, `%${query}%`)
        )
      )
    ).limit(20);
  }

  async sendDirectMessage(msg: InsertDirectMessage): Promise<DirectMessage> {
    const [created] = await db.insert(directMessages).values(msg).returning();
    return created;
  }

  async getDirectMessages(userId1: number, userId2: number, limit = 100): Promise<DirectMessage[]> {
    return db.select().from(directMessages).where(
      or(
        and(eq(directMessages.senderId, userId1), eq(directMessages.receiverId, userId2)),
        and(eq(directMessages.senderId, userId2), eq(directMessages.receiverId, userId1))
      )
    ).orderBy(directMessages.createdAt).limit(limit);
  }

  async getConversations(userId: number): Promise<{ user: User; lastMessage: DirectMessage; unreadCount: number }[]> {
    const allMessages = await db.select().from(directMessages).where(
      or(eq(directMessages.senderId, userId), eq(directMessages.receiverId, userId))
    ).orderBy(desc(directMessages.createdAt));

    const conversationMap = new Map<number, { lastMessage: DirectMessage; unreadCount: number }>();
    for (const msg of allMessages) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!conversationMap.has(otherId)) {
        const unread = allMessages.filter(m => m.senderId === otherId && m.receiverId === userId && !m.read).length;
        conversationMap.set(otherId, { lastMessage: msg, unreadCount: unread });
      }
    }

    const results: { user: User; lastMessage: DirectMessage; unreadCount: number }[] = [];
    for (const [otherId, data] of conversationMap) {
      const otherUser = await this.getUser(otherId);
      if (otherUser) {
        results.push({ user: otherUser, ...data });
      }
    }
    return results;
  }

  async markMessagesAsRead(senderId: number, receiverId: number): Promise<void> {
    await db.update(directMessages).set({ read: true }).where(
      and(eq(directMessages.senderId, senderId), eq(directMessages.receiverId, receiverId), eq(directMessages.read, false))
    );
  }

  async getUnreadCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(directMessages).where(
      and(eq(directMessages.receiverId, userId), eq(directMessages.read, false))
    );
    return Number(result[0]?.count || 0);
  }

  async createChatBackup(backup: InsertChatBackup): Promise<ChatBackup> {
    const [created] = await db.insert(chatBackups).values(backup).returning();
    return created;
  }

  async getChatBackups(userId: number): Promise<ChatBackup[]> {
    return db.select().from(chatBackups).where(eq(chatBackups.userId, userId)).orderBy(desc(chatBackups.createdAt));
  }

  async getChatBackup(id: number): Promise<ChatBackup | undefined> {
    const [backup] = await db.select().from(chatBackups).where(eq(chatBackups.id, id));
    return backup;
  }

  async deleteChatBackup(id: number): Promise<void> {
    await db.delete(chatBackups).where(eq(chatBackups.id, id));
  }

  async getAllUserMessages(userId: number): Promise<DirectMessage[]> {
    return db.select().from(directMessages).where(
      or(eq(directMessages.senderId, userId), eq(directMessages.receiverId, userId))
    ).orderBy(directMessages.createdAt);
  }

  async createVerificationCode(email: string, code: string, type: string): Promise<void> {
    await db.update(verificationCodes)
      .set({ used: true })
      .where(and(eq(verificationCodes.email, email), eq(verificationCodes.type, type), eq(verificationCodes.used, false)));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(verificationCodes).values({ email, code, type, expiresAt });
  }

  async verifyCode(email: string, code: string, type: string): Promise<boolean> {
    const [record] = await db.select().from(verificationCodes).where(
      and(
        eq(verificationCodes.email, email),
        eq(verificationCodes.code, code),
        eq(verificationCodes.type, type),
        eq(verificationCodes.used, false)
      )
    ).orderBy(desc(verificationCodes.createdAt)).limit(1);
    if (!record) return false;
    if (new Date() > record.expiresAt) return false;
    await db.update(verificationCodes).set({ used: true }).where(eq(verificationCodes.id, record.id));
    return true;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(data).returning();
    return result;
  }

  async getFeedbackByUser(userId: number): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }
}

export const storage = new DatabaseStorage();
