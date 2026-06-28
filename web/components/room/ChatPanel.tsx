"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage, Participant } from "@/types";
import { Send, X, MessageSquare, Users } from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessage[];
  myUserId: string;
  participants: Participant[];
  onSend: (content: string, recipientId?: string) => void;
  onClose: () => void;
}

type ChatMode = "room" | "private";

export default function ChatPanel({
  messages,
  myUserId,
  participants,
  onSend,
  onClose,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("room");
  const [selectedPrivateUser, setSelectedPrivateUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const filteredMessages = messages.filter(m => {
    if (mode === "room") return !m.recipientId;
    return (m.recipientId === myUserId || m.senderId === myUserId) &&
           m.senderId === selectedPrivateUser || m.recipientId === selectedPrivateUser;
  });

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input, mode === "private" ? selectedPrivateUser || undefined : undefined);
    setInput("");
  };

  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      className="h-full w-full flex flex-col bg-secondary/30 border-l border-border"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-border bg-secondary/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">{mode === "room" ? "Room Chat" : "Private Chat"}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-primary/20 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode("room"); setSelectedPrivateUser(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "room"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users size={12} />
            Room
          </button>
          <button
            onClick={() => setMode("private")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              mode === "private"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare size={12} />
            Direct
          </button>
        </div>
      </div>

      {/* Private user selector */}
      {mode === "private" && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="flex-shrink-0 p-3 border-b border-border bg-secondary/20 overflow-x-auto"
        >
          <div className="flex gap-2">
            {participants.filter(p => p.userId !== myUserId).map(p => (
              <button
                key={p.userId}
                onClick={() => setSelectedPrivateUser(p.userId)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  selectedPrivateUser === p.userId
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary/80"
                }`}
              >
                {p.displayName}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <AnimatePresence>
          {filteredMessages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.senderId === myUserId ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm break-words ${
                  msg.senderId === myUserId
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/60 text-foreground"
                }`}
              >
                {mode === "room" && msg.senderId !== myUserId && (
                  <p className="text-2xs font-semibold mb-1 opacity-75">
                    {participants.find(p => p.userId === msg.senderId)?.displayName || "Unknown"}
                  </p>
                )}
                <p>{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-secondary/50">
        {mode === "private" && !selectedPrivateUser && (
          <p className="text-2xs text-muted-foreground text-center mb-2">Select a person to chat privately</p>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={mode === "private" && !selectedPrivateUser ? "Select user..." : "Type message..."}
            disabled={mode === "private" && !selectedPrivateUser}
            className="flex-1 bg-secondary/80 border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={mode === "private" && !selectedPrivateUser}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
