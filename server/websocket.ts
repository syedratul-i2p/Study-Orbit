import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import type { RequestHandler } from "express";

const connectedUsers = new Map<number, Set<WebSocket>>();

export function setupWebSocket(httpServer: Server, sessionMiddleware: RequestHandler) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
    if (req.url !== "/ws") return;

    const res = {
      writeHead: () => {},
      end: () => {},
      setHeader: () => {},
      getHeader: () => undefined,
    } as any;

    sessionMiddleware(req as any, res, () => {
      const userId = (req as any).session?.userId;
      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        (ws as any).userId = userId;
        wss.emit("connection", ws, req);
      });
    });
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const userId = (ws as any).userId as number;

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(ws);
    broadcastOnlineStatus(userId, true);
    ws.send(JSON.stringify({ type: "auth_ok", userId }));

    ws.on("close", () => {
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
          broadcastOnlineStatus(userId, false);
        }
      }
    });
  });

  return wss;
}

function broadcastOnlineStatus(userId: number, online: boolean) {
  for (const [, sockets] of connectedUsers) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "user_status", userId, online }));
      }
    }
  }
}

export function sendToUser(userId: number, data: any) {
  const sockets = connectedUsers.get(userId);
  if (sockets) {
    const message = JSON.stringify(data);
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }
}

export function isUserOnline(userId: number): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

export function getOnlineUserIds(): number[] {
  return Array.from(connectedUsers.keys());
}
