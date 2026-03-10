import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  username: text("username").notNull().unique(),
  institution: text("institution"),
  country: text("country").default("Bangladesh"),
  appLanguage: text("app_language").default("bn"),
  chatLanguage: text("chat_language").default("auto"),
  classLevel: text("class_level"),
  department: text("department"),
  board: text("board"),
  studyGoals: text("study_goals").array(),
  weakSubjects: text("weak_subjects").array(),
  strongSubjects: text("strong_subjects").array(),
  dailyStudyHours: integer("daily_study_hours").default(4),
  onboardingComplete: boolean("onboarding_complete").default(false),
  publicStatus: text("public_status"),
  privateNote: text("private_note"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").default("#4F46E5"),
  weeklyTargetHours: integer("weekly_target_hours").default(5),
  priority: text("priority").default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").default("reading"),
  status: text("status").default("pending"),
  deadline: date("deadline"),
  revisionDate: date("revision_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const plannerItems = pgTable("planner_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id"),
  topicId: integer("topic_id"),
  title: text("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  status: text("status").default("pending"),
  type: text("type").default("reading"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const focusSessions = pgTable("focus_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subjectId: integer("subject_id"),
  duration: integer("duration").notNull(),
  type: text("type").default("pomodoro"),
  notes: text("notes"),
  rating: integer("rating"),
  needsRevision: boolean("needs_revision").default(false),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const progressLogs = pgTable("progress_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  totalMinutes: integer("total_minutes").default(0),
  sessionsCompleted: integer("sessions_completed").default(0),
  subjectBreakdown: jsonb("subject_breakdown"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  username: z.string().min(3),
});

export const onboardingSchema = z.object({
  institution: z.string().optional(),
  country: z.string().optional(),
  appLanguage: z.string().optional(),
  chatLanguage: z.string().optional(),
  classLevel: z.string().optional(),
  department: z.string().optional(),
  board: z.string().optional(),
  studyGoals: z.array(z.string()).optional(),
  weakSubjects: z.array(z.string()).optional(),
  strongSubjects: z.array(z.string()).optional(),
  dailyStudyHours: z.number().optional(),
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

export const insertPlannerItemSchema = createInsertSchema(plannerItems).omit({
  id: true,
  createdAt: true,
});

export const insertFocusSessionSchema = createInsertSchema(focusSessions).omit({
  id: true,
  completedAt: true,
});

export const insertProgressLogSchema = createInsertSchema(progressLogs).omit({
  id: true,
  createdAt: true,
});

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull(),
  receiverId: integer("receiver_id").notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatBackups = pgTable("chat_backups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  createdAt: true,
});

export const insertChatBackupSchema = createInsertSchema(chatBackups).omit({
  id: true,
  createdAt: true,
});

export const verificationCodes = pgTable("verification_codes", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  type: text("type").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  rating: integer("rating"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type PlannerItem = typeof plannerItems.$inferSelect;
export type InsertPlannerItem = z.infer<typeof insertPlannerItemSchema>;
export type FocusSession = typeof focusSessions.$inferSelect;
export type InsertFocusSession = z.infer<typeof insertFocusSessionSchema>;
export type ProgressLog = typeof progressLogs.$inferSelect;
export type InsertProgressLog = z.infer<typeof insertProgressLogSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type ChatBackup = typeof chatBackups.$inferSelect;
export type InsertChatBackup = z.infer<typeof insertChatBackupSchema>;

export * from "./models/chat";
