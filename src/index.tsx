import {
  ButtonItem,
  ConfirmModal,
  PanelSection,
  PanelSectionRow,
  TextField,
  showModal,
  staticClasses,
} from "@decky/ui";
import { callable, definePlugin } from "@decky/api";
import React, { useState, useEffect, useRef, FC } from "react";

// ── Backend calls ────────────────────────────────────────────────────────────
const getApiKey = callable<[], string>("get_api_key");
const setApiKey = callable<[string], boolean>("set_api_key");
const clearApiKey = callable<[], boolean>("clear_api_key");

// ── Types ────────────────────────────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

// Message written by the modal, consumed by ChatScreen's own poll — avoids
// any cross-React-root state-update issues with showModal.
let pendingMessage: string | null = null;

// ── Modal text input components (keyboard renders above QAM when in a modal) ──
// Steam's keyboard may write directly to the DOM without firing React onChange,
// so we read the DOM input value directly at submit time as the source of truth.

const ApiKeyModal: FC<{ onSave: (key: string) => void; closeModal?: () => void }> = ({ onSave, closeModal }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOK = () => {
    const el = containerRef.current?.querySelector("input") as HTMLInputElement | null;
    const trimmed = (el?.value ?? "").trim();
    if (!/^([A-Za-z0-9_-]{35,})$/.test(trimmed)) return; // invalid key — keep modal open
    onSave(trimmed);
    closeModal?.();
  };

  return (
    <ConfirmModal strTitle="Gemini API Key" strOKButtonText="Save" onOK={handleOK} onCancel={closeModal} closeModal={closeModal}>
      <div ref={containerRef}>
        <TextField label="API Key" bIsPassword focusOnMount />
      </div>
    </ConfirmModal>
  );
};

// Walk into shadow DOM to find any input/textarea, since Steam UI components
// may encapsulate their internals behind a shadow root.
const findInput = (root: Element | ShadowRoot | null): HTMLInputElement | null => {
  if (!root) return null;
  const el = (root as Element).querySelector?.("input, textarea") as HTMLInputElement | null;
  if (el) return el;
  for (const child of (root as Element).querySelectorAll?.("*") ?? []) {
    if ((child as any).shadowRoot) {
      const found = findInput((child as any).shadowRoot);
      if (found) return found;
    }
  }
  return null;
};

const MessageInputModal: FC<{ closeModal?: () => void }> = ({ closeModal }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef("");

  useEffect(() => {
    // Poll DOM value — Steam keyboard injects text directly without firing JS events.
    const id = setInterval(() => {
      const el = findInput(containerRef.current);
      if (el) valueRef.current = el.value;
    }, 50);
    return () => clearInterval(id);
  }, []);

  const handleSend = () => {
    const el = findInput(containerRef.current);
    const text = (el?.value || valueRef.current).trim();
    if (text) pendingMessage = text; // ChatScreen's poll will pick this up
    closeModal?.();
  };

  return (
    <ConfirmModal strTitle="Message Gemini" strOKButtonText="Send" onOK={handleSend} onCancel={closeModal} closeModal={closeModal}>
      <div ref={containerRef}>
        <TextField
          label=""
          focusOnMount
          onChange={(e) => { valueRef.current = e.currentTarget.value; }}
        />
      </div>
    </ConfirmModal>
  );
};

interface Styles {
  root: React.CSSProperties;
  keyScreen: React.CSSProperties;
  keyTitle: React.CSSProperties;
  keySubtitle: React.CSSProperties;
  keyLink: React.CSSProperties;
  chatWrapper: React.CSSProperties;
  messagesContainer: React.CSSProperties;
  bubble: (role: Message["role"]) => React.CSSProperties;
  roleLabel: (role: Message["role"]) => React.CSSProperties;
  messageGroup: (role: Message["role"]) => React.CSSProperties;
  thinkingDot: React.CSSProperties;
  inputRow: React.CSSProperties;
  inputField: React.CSSProperties;
  headerRow: React.CSSProperties;
  headerTitle: React.CSSProperties;
  headerDot: React.CSSProperties;
  clearBtn: React.CSSProperties;
  emptyState: React.CSSProperties;
  claudeLogo: React.CSSProperties;
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles: Styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    fontFamily: "'Motiva Sans', Arial, sans-serif",
  },
  // ── API Key screen
  keyScreen: {
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  keyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#e8eaed",
    marginBottom: 4,
  },
  keySubtitle: {
    fontSize: 12,
    color: "#8f98a0",
    lineHeight: 1.5,
  },
  keyLink: {
    color: "#67c1f5",
    textDecoration: "underline",
  },
  // ── Chat screen
  chatWrapper: {
    display: "flex",
    flexDirection: "column",
    height: "420px",
  },
  messagesContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  bubble: (role: "user" | "assistant"): React.CSSProperties => ({
    maxWidth: "88%",
    padding: "8px 11px",
    borderRadius: role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
    backgroundColor: role === "user" ? "#1a9fff" : "#2a3a4a",
    color: "#e8eaed",
    fontSize: 12,
    lineHeight: 1.55,
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    wordBreak: "break-word",
    boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
  }),
  roleLabel: (role: "user" | "assistant"): React.CSSProperties => ({
    fontSize: 10,
    color: role === "user" ? "#a8d8ff" : "#8f98a0",
    marginBottom: 3,
    textAlign: role === "user" ? "right" : "left",
  }),
  messageGroup: (role: "user" | "assistant"): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: role === "user" ? "flex-end" : "flex-start",
  }),
  thinkingDot: {
    display: "inline-block",
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#67c1f5",
    margin: "0 2px",
    animation: "bounce 1s infinite",
  },
  inputRow: {
    display: "flex",
    gap: 6,
    padding: "8px 12px",
    borderTop: "1px solid #2a3a4a",
    alignItems: "flex-end",
    background: "#1a1f2e",
  },
  inputField: {
    flex: 1,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px 4px",
    borderBottom: "1px solid #2a3a4a",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "#e8eaed",
  },
  headerDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    backgroundColor: "#00c48c",
    boxShadow: "0 0 6px #00c48c",
  },
  clearBtn: {
    fontSize: 10,
    color: "#8f98a0",
    cursor: "pointer",
    padding: "3px 7px",
    borderRadius: 4,
    background: "transparent",
    border: "1px solid #3a4a5a",
  },
  emptyState: {
    textAlign: "center",
    color: "#8f98a0",
    fontSize: 12,
    marginTop: 40,
    lineHeight: 1.6,
  },
  claudeLogo: {
    fontSize: 18,
  },
};

// ── Typing indicator ─────────────────────────────────────────────────────────
const TypingIndicator: FC = () => (
  <div style={styles.messageGroup("assistant")}>
    <div style={styles.roleLabel("assistant")}>Gemini</div>
    <div style={styles.bubble("assistant")}>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
      <span style={{ ...styles.thinkingDot, animationDelay: "0ms" }} />
      <span style={{ ...styles.thinkingDot, animationDelay: "150ms" }} />
      <span style={{ ...styles.thinkingDot, animationDelay: "300ms" }} />
    </div>
  </div>
);

// ── API Key Setup Screen ──────────────────────────────────────────────────────
const ApiKeyScreen: FC<{ onSave: (key: string) => void }> = ({ onSave }) => (
  <div style={styles.keyScreen}>
    <div style={styles.keyTitle}>🤖 Connect Gemini</div>
    <div style={styles.keySubtitle}>
      Enter your <span style={styles.keyLink}>Google Gemini API key</span> to start chatting. Get one at{" "}
      <span style={styles.keyLink}>ai.google.com</span>
    </div>
    <ButtonItem layout="below" onClick={() => showModal(<ApiKeyModal onSave={onSave} />)}>
      Enter API Key
    </ButtonItem>
  </div>
);

// ── Chat Screen ───────────────────────────────────────────────────────────────
const ChatScreen: FC<{ apiKey: string; onResetKey: () => void }> = ({
  apiKey,
  onResetKey,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages; // always up-to-date, no stale closure
  const [models, setModels] = useState<string[]>(["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"]);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash-lite");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Fetch available models from Gemini API
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
          headers: { "x-goog-api-key": apiKey },
        });
        if (!res.ok) return;
        const data = await res.json();
        // Only include text/chat models
        const modelNames = (data.models || [])
          .map((m: any) => {
            // Remove 'models/' prefix if present
            const raw = m.name || "";
            return raw.startsWith("models/") ? raw.slice(7) : raw;
          })
          .filter((name: string) =>
            /gemini-(\d+\.|)\d*-?flash(-lite)?$/i.test(name)
          );
        // Always include 2.5-flash, 2.5-flash-lite, 1.5-flash as fallback
        const defaults = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"];
        const uniqueModels = Array.from(new Set([...modelNames, ...defaults]));
        setModels(uniqueModels);
        if (!uniqueModels.includes(selectedModel)) {
          // Prefer flash-lite as default if available, else first model
          const preferred = uniqueModels.includes("gemini-2.5-flash-lite") ? "gemini-2.5-flash-lite" : uniqueModels[0];
          setSelectedModel(preferred);
        }
      } catch {}
    };
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Poll for messages submitted via the modal. Runs inside ChatScreen's own
  // React tree so setMessages/setLoading update the correct root.
  useEffect(() => {
    const id = setInterval(() => {
      if (pendingMessage) {
        const text = pendingMessage;
        pendingMessage = null;
        sendMessageRef.current(text);
      }
    }, 100);
    return () => clearInterval(id);
  }, []);

  const sendMessageRef = useRef<(t: string) => void>(() => {});

  const sendMessage = async (text: string) => {
    if (!text || loading) return;

    const newMessages: Message[] = [...messagesRef.current, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    const contents = newMessages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({ contents }),
        }
      );

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          errMsg = err?.error?.message || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no response)";
      setMessages([
        ...newMessages,
        { role: "assistant", content: reply },
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: `⚠️ Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  sendMessageRef.current = sendMessage;

  return (
    <div style={styles.chatWrapper}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.headerTitle}>
          <span style={styles.headerDot} />
          <span>Gemini AI</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={styles.clearBtn}
            onClick={() => setMessages([])}
          >
            Clear
          </button>
          <button
            style={styles.clearBtn}
            onClick={onResetKey}
          >
            API Key
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messagesContainer}>
        {messages.length === 0 && !loading && (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
            <div>Ask Gemini anything!</div>
            <div style={{ fontSize: 11, marginTop: 4, color: "#6a7a8a" }}>
              Tips, strategies, recipes, code…
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={styles.messageGroup(msg.role)}>
            <div style={styles.roleLabel(msg.role)}>
              {msg.role === "user" ? "You" : "Gemini"}
            </div>
            <div style={styles.bubble(msg.role)}>{msg.content}</div>
          </div>
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Model + Input */}
      <div style={{ ...styles.inputRow, flexDirection: "column", alignItems: "stretch", gap: 4 }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <select
            style={{ minWidth: 180, fontSize: 12, padding: 4, borderRadius: 4, border: "1px solid #3a4a5a", background: "#1a1f2e", color: "#e8eaed" }}
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            disabled={loading}
          >
            {models.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
        <ButtonItem
          layout="below"
          disabled={loading}
          onClick={() => showModal(<MessageInputModal />)}
        >
          {loading ? "Sending…" : "Type a message…"}
        </ButtonItem>
      </div>
    </div>
  );
};

// ── Root Component ────────────────────────────────────────────────────────────
const Content: FC = () => {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getApiKey().then((key) => {
      setApiKeyState(key || null);
      setLoaded(true);
    });
  }, []);

  const handleSaveKey = async (key: string) => {
    await setApiKey(key);
    setApiKeyState(key);
  };

  const handleResetKey = async () => {
    await clearApiKey();
    setApiKeyState(null);
  };

  if (!loaded) {
    return (
      <PanelSection>
        <PanelSectionRow>
          <div style={{ color: "#8f98a0", fontSize: 12, textAlign: "center" }}>
            Loading…
          </div>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  return (
    <div style={styles.root}>
      {!apiKey ? (
        <ApiKeyScreen onSave={handleSaveKey} />
      ) : (
        <ChatScreen apiKey={apiKey} onResetKey={handleResetKey} />
      )}
    </div>
  );
};

// ── Plugin Definition ─────────────────────────────────────────────────────────
export default definePlugin(() => {
  return {
    name: "GeminiAI",
    titleView: <div className={staticClasses.Title}>Gemini AI</div>,
    content: <Content />, 
    icon: <span style={{ fontSize: 16 }}>🌟</span>,
    onDismount() {},
  };
});
