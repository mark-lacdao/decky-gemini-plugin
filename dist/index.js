const manifest = {"name":"GeminiAI"};
const API_VERSION = 2;
const internalAPIConnection = window.__DECKY_SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_deckyLoaderAPIInit;
if (!internalAPIConnection) {
    throw new Error('[@decky/api]: Failed to connect to the loader as as the loader API was not initialized. This is likely a bug in Decky Loader.');
}
let api;
try {
    api = internalAPIConnection.connect(API_VERSION, manifest.name);
}
catch {
    api = internalAPIConnection.connect(1, manifest.name);
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version 1. Some features may not work.`);
}
if (api._version != API_VERSION) {
    console.warn(`[@decky/api] Requested API version ${API_VERSION} but the running loader only supports version ${api._version}. Some features may not work.`);
}
const callable = api.callable;
const definePlugin = (fn) => {
    return (...args) => {
        return fn(...args);
    };
};

// ── Backend calls ────────────────────────────────────────────────────────────
const getApiKey = callable("get_api_key");
const setApiKey = callable("set_api_key");
const clearApiKey = callable("clear_api_key");
const DeckyTextField = DFL.TextField;
// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
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
    bubble: (role) => ({
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
    roleLabel: (role) => ({
        fontSize: 10,
        color: role === "user" ? "#a8d8ff" : "#8f98a0",
        marginBottom: 3,
        textAlign: role === "user" ? "right" : "left",
    }),
    messageGroup: (role) => ({
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
const TypingIndicator = () => (SP_REACT.createElement("div", { style: styles.messageGroup("assistant") },
    SP_REACT.createElement("div", { style: styles.roleLabel("assistant") }, "Gemini"),
    SP_REACT.createElement("div", { style: styles.bubble("assistant") },
        SP_REACT.createElement("style", null, `
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `),
        SP_REACT.createElement("span", { style: { ...styles.thinkingDot, animationDelay: "0ms" } }),
        SP_REACT.createElement("span", { style: { ...styles.thinkingDot, animationDelay: "150ms" } }),
        SP_REACT.createElement("span", { style: { ...styles.thinkingDot, animationDelay: "300ms" } }))));
// ── API Key Setup Screen ──────────────────────────────────────────────────────
const ApiKeyScreen = ({ onSave }) => {
    const [key, setKey] = SP_REACT.useState("");
    const [error, setError] = SP_REACT.useState("");
    const handleSave = () => {
        const trimmed = key.trim();
        // Gemini API keys are typically 39+ chars, alphanumeric, often start with "AIza" or similar
        if (!/^([A-Za-z0-9_-]{35,})$/.test(trimmed)) {
            setError("Please enter a valid Google Gemini API key.");
            return;
        }
        onSave(trimmed);
    };
    return (SP_REACT.createElement("div", { style: styles.keyScreen },
        SP_REACT.createElement("div", { style: styles.keyTitle }, "\uD83E\uDD16 Connect Gemini"),
        SP_REACT.createElement("div", { style: styles.keySubtitle },
            "Enter your ",
            SP_REACT.createElement("span", { style: styles.keyLink }, "Google Gemini API key"),
            " to start chatting. Get one at ",
            " ",
            SP_REACT.createElement("span", { style: styles.keyLink }, "ai.google.com")),
        SP_REACT.createElement(DFL.TextField, { label: "Gemini API Key", value: key, onChange: (e) => {
                setKey(e.target.value);
                setError("");
            }, bIsPassword: true }),
        error && (SP_REACT.createElement("div", { style: { color: "#ff6b6b", fontSize: 11 } }, error)),
        SP_REACT.createElement(DFL.ButtonItem, { layout: "below", onClick: handleSave }, "Save & Start Chatting")));
};
// ── Chat Screen ───────────────────────────────────────────────────────────────
const ChatScreen = ({ apiKey, onResetKey, }) => {
    const [messages, setMessages] = SP_REACT.useState([]);
    const [input, setInput] = SP_REACT.useState("");
    const [loading, setLoading] = SP_REACT.useState(false);
    const [models, setModels] = SP_REACT.useState(["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"]);
    const [selectedModel, setSelectedModel] = SP_REACT.useState("gemini-2.5-flash-lite");
    const bottomRef = SP_REACT.useRef(null);
    SP_REACT.useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);
    // Fetch available models from Gemini API
    SP_REACT.useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
                    headers: { "x-goog-api-key": apiKey },
                });
                if (!res.ok)
                    return;
                const data = await res.json();
                // Only include text/chat models
                const modelNames = (data.models || [])
                    .map((m) => {
                    // Remove 'models/' prefix if present
                    const raw = m.name || "";
                    return raw.startsWith("models/") ? raw.slice(7) : raw;
                })
                    .filter((name) => /gemini-(\d+\.|)\d*-?flash(-lite)?$/i.test(name));
                // Always include 2.5-flash, 2.5-flash-lite, 1.5-flash as fallback
                const defaults = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"];
                const uniqueModels = Array.from(new Set([...modelNames, ...defaults]));
                setModels(uniqueModels);
                if (!uniqueModels.includes(selectedModel)) {
                    // Prefer flash-lite as default if available, else first model
                    const preferred = uniqueModels.includes("gemini-2.5-flash-lite") ? "gemini-2.5-flash-lite" : uniqueModels[0];
                    setSelectedModel(preferred);
                }
            }
            catch { }
        };
        fetchModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiKey]);
    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading)
            return;
        const newMessages = [...messages, { role: "user", content: text }];
        setMessages(newMessages);
        setInput("");
        setLoading(true);
        const contents = newMessages.map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({ contents }),
            });
            if (!res.ok) {
                let errMsg = `HTTP ${res.status}`;
                try {
                    const err = await res.json();
                    errMsg = err?.error?.message || errMsg;
                }
                catch { }
                throw new Error(errMsg);
            }
            const data = await res.json();
            const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(no response)";
            setMessages([
                ...newMessages,
                { role: "assistant", content: reply },
            ]);
        }
        catch (err) {
            setMessages([
                ...newMessages,
                { role: "assistant", content: `⚠️ Error: ${err.message}` },
            ]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };
    return (SP_REACT.createElement("div", { style: styles.chatWrapper },
        SP_REACT.createElement("div", { style: styles.headerRow },
            SP_REACT.createElement("div", { style: styles.headerTitle },
                SP_REACT.createElement("span", { style: styles.headerDot }),
                SP_REACT.createElement("span", null, "Gemini AI")),
            SP_REACT.createElement("div", { style: { display: "flex", gap: 6 } },
                SP_REACT.createElement("button", { style: styles.clearBtn, onClick: () => setMessages([]) }, "Clear"),
                SP_REACT.createElement("button", { style: styles.clearBtn, onClick: onResetKey }, "API Key"))),
        SP_REACT.createElement("div", { style: styles.messagesContainer },
            messages.length === 0 && !loading && (SP_REACT.createElement("div", { style: styles.emptyState },
                SP_REACT.createElement("div", { style: { fontSize: 28, marginBottom: 8 } }, "\u2726"),
                SP_REACT.createElement("div", null, "Ask Gemini anything!"),
                SP_REACT.createElement("div", { style: { fontSize: 11, marginTop: 4, color: "#6a7a8a" } }, "Tips, strategies, recipes, code\u2026"))),
            messages.map((msg, i) => (SP_REACT.createElement("div", { key: i, style: styles.messageGroup(msg.role) },
                SP_REACT.createElement("div", { style: styles.roleLabel(msg.role) }, msg.role === "user" ? "You" : "Gemini"),
                SP_REACT.createElement("div", { style: styles.bubble(msg.role) }, msg.content)))),
            loading && SP_REACT.createElement(TypingIndicator, null),
            SP_REACT.createElement("div", { ref: bottomRef })),
        SP_REACT.createElement("div", { style: { ...styles.inputRow, flexDirection: "column", alignItems: "stretch", gap: 4 } },
            SP_REACT.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } },
                SP_REACT.createElement("select", { style: { minWidth: 180, fontSize: 12, padding: 4, borderRadius: 4, border: "1px solid #3a4a5a", background: "#1a1f2e", color: "#e8eaed" }, value: selectedModel, onChange: e => setSelectedModel(e.target.value), disabled: loading }, models.map((model) => (SP_REACT.createElement("option", { key: model, value: model }, model))))),
            SP_REACT.createElement("div", { style: { display: "flex", flexDirection: "row", alignItems: "flex-end", gap: 8, width: "100%" } },
                SP_REACT.createElement("div", { style: { flex: 3, minWidth: 0 } },
                    SP_REACT.createElement(DeckyTextField, { label: "", value: input, placeholder: "Message Gemini...", focusable: true, multiline: true, focusOnMount: true, onChange: (e) => setInput(e.currentTarget.value), onKeyDown: handleKeyDown })),
                SP_REACT.createElement("div", { style: {
                        flex: '0 0 25%', // don't grow, don't shrink, stay exactly 25%
                        maxWidth: '25%', // belt-and-suspenders cap
                        height: 44,
                        padding: 0,
                        margin: 0,
                        overflow: 'hidden', // prevent ButtonItem's internals from bleeding out
                        alignSelf: 'stretch',
                        display: 'flex',
                        alignItems: 'stretch'
                    } },
                    SP_REACT.createElement("div", { style: { width: '100%', height: '100%' } },
                        SP_REACT.createElement(DFL.ButtonItem, { layout: "below", onClick: sendMessage, disabled: loading || !input.trim() }, "\u2191")))))));
};
// ── Root Component ────────────────────────────────────────────────────────────
const Content = () => {
    const [apiKey, setApiKeyState] = SP_REACT.useState(null);
    const [loaded, setLoaded] = SP_REACT.useState(false);
    SP_REACT.useEffect(() => {
        getApiKey().then((key) => {
            setApiKeyState(key || null);
            setLoaded(true);
        });
    }, []);
    const handleSaveKey = async (key) => {
        await setApiKey(key);
        setApiKeyState(key);
    };
    const handleResetKey = async () => {
        await clearApiKey();
        setApiKeyState(null);
    };
    if (!loaded) {
        return (SP_REACT.createElement(DFL.PanelSection, null,
            SP_REACT.createElement(DFL.PanelSectionRow, null,
                SP_REACT.createElement("div", { style: { color: "#8f98a0", fontSize: 12, textAlign: "center" } }, "Loading\u2026"))));
    }
    return (SP_REACT.createElement("div", { style: styles.root }, !apiKey ? (SP_REACT.createElement(ApiKeyScreen, { onSave: handleSaveKey })) : (SP_REACT.createElement(ChatScreen, { apiKey: apiKey, onResetKey: handleResetKey }))));
};
// ── Plugin Definition ─────────────────────────────────────────────────────────
var index = definePlugin(() => {
    return {
        name: "GeminiAI",
        titleView: SP_REACT.createElement("div", { className: DFL.staticClasses.Title }, "Gemini AI"),
        content: SP_REACT.createElement(Content, null),
        icon: SP_REACT.createElement("span", { style: { fontSize: 16 } }, "\uD83C\uDF1F"),
        onDismount() { },
    };
});

export { index as default };
//# sourceMappingURL=index.js.map
