"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chatFetch, iamFetch } from "@/lib/api";
import { getSocket } from "@/lib/socket";

type Conversation = {
  _id: string;
  type: "dm" | "group";
  name?: string;
  members: string[];
};

export default function ChatPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await iamFetch("/auth/me");
      if (!meRes.ok) {
        router.replace("/login");
        return;
      }
      const meData = await meRes.json();
      setMe(meData.user);

      const convRes = await chatFetch("/chat/conversations");
      const convData = await convRes.json();
      setConversations(convData.conversations || []);
    })();
  }, [router]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("message:new", (payload: any) => {
      if (payload?.message?.conversationId === activeId) {
        setMessages((m) => [...m, payload.message]);
      }
    });

    return () => {
      socket.off("message:new");
    };
  }, [activeId]);

  async function openConversation(conversationId: string) {
    setActiveId(conversationId);

    const socket = getSocket();
    socket.emit("conversation:join", { conversationId });

    const res = await chatFetch(`/chat/conversations/${conversationId}/messages`);
    const data = await res.json();
    setMessages(data.messages || []);
  }

  function sendMessage() {
    if (!activeId || !text.trim()) return;
    const socket = getSocket();
    socket.emit("message:send", { conversationId: activeId, body: text });
    setText("");
  }

  if (!me) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen grid grid-cols-12">
      <aside className="col-span-4 border-r p-4">
        <h2 className="font-semibold">Conversations</h2>
        <div className="mt-3 space-y-2">
          {conversations.map((c) => (
            <button
              key={c._id}
              className={`w-full text-left border rounded p-2 ${
                activeId === c._id ? "bg-gray-100" : ""
              }`}
              onClick={() => openConversation(c._id)}
            >
              <div className="text-sm font-medium">
                {c.type === "group" ? c.name || "Unnamed Group" : "DM"}
              </div>
              <div className="text-xs text-gray-500">{c.type}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="col-span-8 p-4 flex flex-col">
        <h2 className="font-semibold">Chat</h2>

        <div className="mt-3 flex-1 border rounded p-3 overflow-y-auto space-y-2">
          {messages.map((m) => (
            <div key={m.id || m._id} className="text-sm">
              <span className="font-medium">{m.senderId}</span>: {m.body}
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            className="flex-1 border rounded p-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={activeId ? "Type a message..." : "Select a conversation first"}
            disabled={!activeId}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button className="border rounded px-4" onClick={sendMessage} disabled={!activeId}>
            Send
          </button>
        </div>
      </main>
    </div>
  );
}
