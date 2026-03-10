import CryptoJS from "crypto-js";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  subjectContext?: string;
}

const DB_NAME = "studyflow-ai-chats";
const DB_VERSION = 2;
const STORE_NAME = "conversations";
const DM_STORE_NAME = "directMessages";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("pinned", "pinned", { unique: false });
      }
      if (!db.objectStoreNames.contains(DM_STORE_NAME)) {
        const dmStore = db.createObjectStore(DM_STORE_NAME, { keyPath: "id" });
        dmStore.createIndex("participants", "participantKey", { unique: false });
        dmStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllChats(): Promise<ChatConversation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const chats = request.result as ChatConversation[];
      chats.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
      resolve(chats);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getChat(id: string): Promise<ChatConversation | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveChat(chat: ChatConversation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(chat);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteChat(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function searchChats(query: string): Promise<ChatConversation[]> {
  const allChats = await getAllChats();
  const lower = query.toLowerCase();
  return allChats.filter(
    (chat) =>
      chat.title.toLowerCase().includes(lower) ||
      chat.messages.some((m) => m.content.toLowerCase().includes(lower))
  );
}

export async function exportChats(encryptionKey: string): Promise<string> {
  const chats = await getAllChats();
  const data = JSON.stringify(chats);
  const encrypted = CryptoJS.AES.encrypt(data, encryptionKey).toString();
  return encrypted;
}

export async function importChats(encrypted: string, encryptionKey: string): Promise<number> {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, encryptionKey);
    const data = bytes.toString(CryptoJS.enc.Utf8);
    const chats: ChatConversation[] = JSON.parse(data);
    for (const chat of chats) {
      await saveChat(chat);
    }
    return chats.length;
  } catch {
    throw new Error("Failed to decrypt. Check your encryption key.");
  }
}

export function createNewChat(subjectContext?: string): ChatConversation {
  return {
    id: crypto.randomUUID(),
    title: "New Conversation",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pinned: false,
    subjectContext,
  };
}

export function generateChatTitle(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\n/g, " ").trim();
  if (cleaned.length <= 50) return cleaned;
  return cleaned.substring(0, 47) + "...";
}

function makeParticipantKey(userId1: number, userId2: number): string {
  return [Math.min(userId1, userId2), Math.max(userId1, userId2)].join("-");
}

export async function saveDirectMessages(currentUserId: number, otherUserId: number, messages: any[]): Promise<void> {
  const db = await openDB();
  const participantKey = makeParticipantKey(currentUserId, otherUserId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DM_STORE_NAME, "readwrite");
    const store = tx.objectStore(DM_STORE_NAME);
    for (const msg of messages) {
      store.put({ ...msg, participantKey });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalDirectMessages(currentUserId: number, otherUserId: number): Promise<any[]> {
  const db = await openDB();
  const participantKey = makeParticipantKey(currentUserId, otherUserId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DM_STORE_NAME, "readonly");
    const store = tx.objectStore(DM_STORE_NAME);
    const index = store.index("participants");
    const request = index.getAll(participantKey);
    request.onsuccess = () => {
      const msgs = request.result || [];
      msgs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      resolve(msgs);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addLocalDirectMessage(currentUserId: number, msg: any): Promise<void> {
  const db = await openDB();
  const otherUserId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
  const participantKey = makeParticipantKey(currentUserId, otherUserId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DM_STORE_NAME, "readwrite");
    const store = tx.objectStore(DM_STORE_NAME);
    store.put({ ...msg, participantKey });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllDirectMessages(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DM_STORE_NAME, "readwrite");
    const store = tx.objectStore(DM_STORE_NAME);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
