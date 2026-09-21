import fs from 'fs';
import path from 'path';
import { ChatMessage } from './types';

function getChatFilePath(serverDir: string): string {
  const dir = path.join(serverDir, 'craftdock-data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {}
  }
  return path.join(dir, 'chat-history.json');
}

function loadChatMessages(serverDir: string): ChatMessage[] {
  const filePath = getChatFilePath(serverDir);
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Failed to load chat messages for ${serverDir}:`, err);
    return [];
  }
}

function saveChatMessages(serverDir: string, messages: ChatMessage[]): void {
  const filePath = getChatFilePath(serverDir);
  try {
    // Keep at most 1500 messages
    const trimmed = messages.slice(-1500);
    fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save chat messages for ${serverDir}:`, err);
  }
}

// Regex to detect in-game player chat
// Matches e.g.
// "[12:34:56 INFO]: <Steve> Hello everyone!"
// "[12:34:56] [Server thread/INFO]: <Steve> hello"
// "[12:34:56] [Async Chat Thread - #0/INFO]: <Alex> Good morning"
// "<Player_123> Test message"
const CHAT_REGEX = /<([a-zA-Z0-9_]{2,20})>\s+(.+)$/;

export function parseChatLine(rawLine: string): { player: string; message: string; timeFormatted: string } | null {
  if (!rawLine) return null;
  const cleanLine = rawLine.trim();
  const match = cleanLine.match(CHAT_REGEX);
  if (!match) return null;

  const player = match[1];
  const message = match[2].trim();
  if (!player || !message) return null;

  // Try extracting [HH:mm:ss] from the beginning if present
  const timeMatch = cleanLine.match(/\[(\d{1,2}:\d{2}:\d{2})\]/);
  const now = new Date();
  const timeFormatted = timeMatch
    ? timeMatch[1]
    : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  return { player, message, timeFormatted };
}

export function onConsoleLine(serverDir: string, rawLine: string): ChatMessage | null {
  const parsed = parseChatLine(rawLine);
  if (!parsed) return null;

  const now = new Date();
  const chatMsg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.toISOString(),
    timeFormatted: parsed.timeFormatted,
    player: parsed.player,
    message: parsed.message,
    avatarUrl: `https://minotar.net/helm/${encodeURIComponent(parsed.player)}/32.png`,
  };

  const messages = loadChatMessages(serverDir);
  messages.push(chatMsg);
  saveChatMessages(serverDir, messages);

  return chatMsg;
}

export function getChatHistory(serverDir: string, limit: number = 200): ChatMessage[] {
  const messages = loadChatMessages(serverDir);
  return messages.slice(-limit).reverse(); // Latest first
}

export function clearChatHistory(serverDir: string): boolean {
  try {
    const filePath = getChatFilePath(serverDir);
    if (fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
    }
    return true;
  } catch (err) {
    console.error(`Failed to clear chat history for ${serverDir}:`, err);
    return false;
  }
}
