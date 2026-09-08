"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Plus, MessageSquare, KeyRound, Zap, Code2, PenLine, Lightbulb, Copy, Square, Trash2, Download, SlidersHorizontal, Radio } from "lucide-react";
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem, ComboboxEmpty } from "@/components/ui/combobox";
import { streamChat } from "@/lib/openrouter.mjs";

const STORAGE = "relay.chats.v1";
const starters = [
  [Code2, "Build something", "Help me plan a small coding project. Ask me what I want to build."],
  [PenLine, "Find the right words", "Help me write something clearly. Ask me about the audience and what I want to say."],
  [Lightbulb, "Think it through", "Help me think through a decision. Ask me what I am deciding between."],
];

function MessageBody({ text }) {
  return text.split(/```/).map((part, i) => i % 2 ? <pre key={i}><code>{part.replace(/^[\w+-]*\n/, "")}</code></pre> : <div key={i} className="message-text">{part}</div>);
}

export default function Home() { return <SidebarProvider><Chat /></SidebarProvider>; }

function Chat() {
  const [chats, setChats] = useState([]);
  const [active, setActive] = useState(null);
  const [ready, setReady] = useState(false);
  const [draft, setDraft] = useState("");
  const [key, setKey] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [settings, setSettings] = useState(false);
  const [models, setModels] = useState([]);
  const [model, setModel] = useState(null);
  const [modelError, setModelError] = useState("");
  const [loadingModels, setLoadingModels] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [system, setSystem] = useState("");
  const [maxTokens, setMaxTokens] = useState(2048);
  const controller = useRef(null);
  const scroll = useRef(null);
  const input = useRef(null);
  const { setOpenMobile } = useSidebar();
  const current = chats.find(c => c.id === active);
  const messages = current?.messages || [];

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE) || "[]");
      if (Array.isArray(saved)) {
        const valid = saved.filter(c => typeof c.id === "string" && typeof c.title === "string" && Array.isArray(c.messages) && c.messages.every(m => ["user", "assistant"].includes(m.role) && typeof m.content === "string"));
        setChats(valid); setActive(valid[0]?.id || null);
      }
    } catch { setNotice("Saved chats could not be loaded. You can still start a new conversation."); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(STORAGE, JSON.stringify(chats)); } catch { setNotice("Browser storage is full or unavailable. Export your chat to keep a copy."); } } }, [chats, ready]);
  useEffect(() => { loadModels(); return () => controller.current?.abort(); }, []);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages]);

  async function loadModels() {
    setLoadingModels(true); setModelError("");
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      if (!response.ok) throw new Error("Could not load models. Try again.");
      const data = await response.json();
      const list = (data.data || []).filter(m => m.architecture?.output_modalities?.includes("text") && m.architecture?.input_modalities?.includes("text")).sort((a,b) => a.name.localeCompare(b.name));
      if (!list.length) throw new Error("No text models are available right now.");
      setModels(list); setModel(prev => list.find(m => m.id === prev?.id) || list.find(m => m.id === "openrouter/auto") || list[0]);
    } catch (e) { setModelError(e.message || "Could not connect to OpenRouter."); }
    finally { setLoadingModels(false); }
  }
  function newChat() { if (busy) return; setActive(null); setDraft(""); setNotice(""); setOpenMobile(false); input.current?.focus(); }
  function updateMessage(chatId, messageId, patch) { setChats(all => all.map(c => c.id === chatId ? { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, ...patch } : m) } : c)); }
  async function send(event) {
    event?.preventDefault();
    if (busy || controller.current || !draft.trim()) return;
    if (!key) { setSettings(true); return; }
    if (!model) { setNotice("Choose an available model first."); return; }
    const text = draft.trim();
    const id = active || crypto.randomUUID();
    const replyId = crypto.randomUUID();
    const history = [...messages.filter(m => m.content && !m.error), { id: crypto.randomUUID(), role: "user", content: text }];
    const next = [...history, { id: replyId, role: "assistant", content: "", model: model.name }];
    setChats(all => active ? all.map(c => c.id === id ? { ...c, messages: next } : c) : [{ id, title: text.slice(0, 48), messages: next }, ...all]);
    setActive(id); setDraft(""); setNotice(""); setBusy(true);
    const abort = new AbortController(); controller.current = abort;
    let content = "";
    try {
      await streamChat({ key, model: model.id, messages: [...(system.trim() ? [{ role: "system", content: system.trim() }] : []), ...history.map(({role,content}) => ({role,content}))], maxTokens: Math.max(1, Math.min(8192, Number(maxTokens) || 2048)), signal: abort.signal,
        onChunk(chunk) { content += chunk; updateMessage(id, replyId, { content }); },
        onUsage(usage) { updateMessage(id, replyId, { usage }); }
      });
      if (!content) throw new Error("The model returned no text. Try another model.");
    } catch(e) {
      const error = e.name === "AbortError" ? "Stopped." : e.message || "Connection failed. Try again.";
      updateMessage(id, replyId, { error });
    } finally { controller.current = null; setBusy(false); }
  }
  function exportChat() {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "relay-chat.json"; a.click(); URL.revokeObjectURL(url);
  }
  async function copy(text) { try { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); } catch { setNotice("Clipboard access is unavailable. Select the text to copy it."); } }
  return <>
    <Sidebar className="relay-sidebar">
      <SidebarHeader className="side-head"><div className="wordmark"><Radio size={25}/><span>relay<span className="brand-dot">.</span></span></div><button className="new-chat" onClick={newChat} disabled={busy}><Plus size={18}/> New conversation <span>↗</span></button></SidebarHeader>
      <SidebarContent className="side-content"><p className="eyebrow">YOUR CONVERSATIONS</p><SidebarMenu>{chats.map(c => <SidebarMenuItem key={c.id}><SidebarMenuButton className="chat-link" isActive={active === c.id} disabled={busy} onClick={() => {setActive(c.id);setNotice("");setDraft("");setOpenMobile(false);}}><MessageSquare/><span>{c.title}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>{!chats.length && <p className="history-empty">A little room for your next big idea.<br/>Your chats will appear here.</p>}</SidebarContent>
      <SidebarFooter className="side-foot"><div className="local-note">Saved in this browser<br/><span>No account. No cross-device sync.</span></div><button className="connection" onClick={() => { setKeyDraft(key);setSettings(true); }}><KeyRound size={18}/><span>{key ? "OpenRouter connected" : "Connect OpenRouter"}<small>{key ? "Manage your connection" : "Bring your own API key"}</small></span><SlidersHorizontal size={16}/></button></SidebarFooter>
    </Sidebar>
    <main className="workspace">
      <header className="topbar"><div className="top-left"><SidebarTrigger/><span className="section-name">Chat</span><span className="divider"/><div className="model-picker"><Combobox items={models} value={model} onValueChange={setModel} itemToStringLabel={m => m?.name || ""} disabled={busy}><ComboboxInput aria-label="Choose a model" placeholder={loadingModels ? "Loading models…" : "Search models"}/><ComboboxContent><ComboboxEmpty>No matching models.</ComboboxEmpty><ComboboxList>{m => <ComboboxItem key={m.id} value={m}><div><strong>{m.name}</strong><small className="model-detail">{m.id} · ${Number(Number(m.pricing?.prompt || 0)*1000000).toFixed(2)} / 1M input tokens</small></div></ComboboxItem>}</ComboboxList></ComboboxContent></Combobox></div></div><button className="icon-button" title="Chat settings" aria-label="Chat settings" onClick={() => {setKeyDraft(key);setSettings(true);}}><SlidersHorizontal size={19}/></button></header>
      {modelError && <div className="banner" role="alert">{modelError}<button onClick={loadModels}>Retry</button></div>}
      <div className="conversation" ref={scroll}>
        {!messages.length ? <section className="welcome"><div className="welcome-mark"><Radio size={34}/></div><p className="eyebrow">YOUR MODELS. YOUR SPACE.</p><h1>Where do we<br/>go from here<span>?</span></h1><p className="welcome-sub">A fresh thought. A tricky question. Something worth making.</p><div className="starter-grid">{starters.map(([Icon,title,prompt]) => <button key={title} onClick={() => {setDraft(prompt);input.current?.focus();}}><Icon size={21}/><span>{title}</span><span className="starter-plus">+</span></button>)}</div>{!key && <button className="inline-connect" onClick={() => setSettings(true)}><KeyRound size={15}/> Add your OpenRouter key to get started</button>}</section> : <div className="messages">{messages.map(m => <article key={m.id} className={`message ${m.role}`}><div className="message-meta">{m.role === "assistant" ? <><Radio size={18}/>{m.model || "Assistant"}</> : "You"}</div><MessageBody text={m.content}/>{!m.content && !m.error && <span className="thinking">Thinking…</span>}{m.error && <p className="message-error" role="alert">{m.error}</p>}{m.role === "assistant" && m.content && <div className="message-tools"><button onClick={() => copy(m.content)} aria-label="Copy response"><Copy size={14}/> Copy</button>{m.usage && <span>{m.usage.total_tokens ? `${m.usage.total_tokens.toLocaleString()} tokens` : ""}{typeof m.usage.cost === "number" ? ` · $${m.usage.cost.toFixed(5)}` : ""}</span>}</div>}</article>)}</div>}
      </div>
      <div className="composer-wrap">{notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}<form className="composer" onSubmit={send}><textarea ref={input} aria-label="Message" placeholder="Ask anything, make something…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if(e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing){ e.preventDefault();send(); } }} rows={2}/><div className="composer-bottom"><span><Zap size={14}/> Powered by OpenRouter</span>{busy ? <button type="button" className="send" aria-label="Stop generating" onClick={() => controller.current?.abort()}><Square size={17}/></button> : <button className="send" aria-label="Send message" disabled={!ready || !draft.trim() || !model}><ArrowUp size={21}/></button>}</div></form><div className="below-composer"><span>AI can make mistakes. Check what matters.</span>{current && <div><button onClick={exportChat}><Download size={13}/> Export</button><button disabled={busy} onClick={() => { if(window.confirm("Delete this conversation from this browser?")){setChats(all=>all.filter(c=>c.id!==active));setActive(null);} }}><Trash2 size={13}/> Delete</button></div>}</div></div>
    </main>
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="settings"><DialogTitle>Your connection</DialogTitle><DialogDescription>Use any supported text model with your OpenRouter key.</DialogDescription><label htmlFor="api-key">OpenRouter API key</label><input id="api-key" type="password" autoComplete="off" placeholder="sk-or-v1-…" value={keyDraft} onChange={e=>setKeyDraft(e.target.value)}/><p className="settings-note">Your key stays in this tab’s memory and is sent only to OpenRouter. Reloading clears it. Messages go to OpenRouter and the selected provider.</p><a href="https://openrouter.ai/settings/keys" target="_blank" rel="noreferrer">Get an OpenRouter key ↗</a><label htmlFor="system">Instructions <span>(optional)</span></label><textarea id="system" placeholder="How would you like the model to respond?" value={system} onChange={e=>setSystem(e.target.value)} rows={3}/><label htmlFor="tokens">Maximum response tokens</label><input id="tokens" type="number" min="1" max="8192" value={maxTokens} onChange={e=>setMaxTokens(e.target.value)}/><p className="settings-note">Settings apply to your next message. Usage is billed to your OpenRouter account.</p><div className="settings-actions">{key && <button onClick={()=>{setKey("");setKeyDraft("");setSettings(false);}}>Disconnect</button>}<button className="primary-button" onClick={()=>{setKey(keyDraft.trim());setMaxTokens(Math.max(1,Math.min(8192,Number(maxTokens)||2048)));setSettings(false);}}>Save settings</button></div></DialogContent></Dialog>
  </>;
}
