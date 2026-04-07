import type { AgentChunkPayload, ChatMessageRPC } from "shared/rpc";

type ChatMessage = ChatMessageRPC;

type SessionInfo = {
	id: string;
	title: string;
};

import QRCode from "qrcode";
import { networkInterfaces } from "node:os";

let server: ReturnType<typeof Bun.serve> | null = null;
let authToken = "";
let currentMessages: ChatMessage[] = [];
let sessions: SessionInfo[] = [];
let activeSessionId: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clients = new Set<any>();

// Callbacks — set by index.ts
let sendPromptCallback: ((text: string) => void) | null = null;
let abortCallback: (() => void) | null = null;
let switchSessionCallback: ((sessionId: string) => void) | null = null;

export function setSendPromptCallback(cb: (text: string) => void) {
	sendPromptCallback = cb;
}

export function setAbortCallback(cb: () => void) {
	abortCallback = cb;
}

export function setSwitchSessionCallback(cb: (sessionId: string) => void) {
	switchSessionCallback = cb;
}

function getLanIp(): string {
	const interfaces = networkInterfaces();
	for (const iface of Object.values(interfaces)) {
		if (!iface) continue;
		for (const addr of iface) {
			if (addr.family === "IPv4" && !addr.internal) {
				return addr.address;
			}
		}
	}
	return "127.0.0.1";
}

function generateToken(): string {
	const bytes = new Uint8Array(12);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function validateAuth(request: Request): boolean {
	const url = new URL(request.url);
	const queryToken = url.searchParams.get("token");
	if (queryToken && queryToken === authToken) return true;
	const authHeader = request.headers.get("authorization");
	if (authHeader === `Bearer ${authToken}`) return true;
	return false;
}

function validateWsAuth(request: Request): boolean {
	const url = new URL(request.url);
	return url.searchParams.get("token") === authToken;
}

function broadcast(data: object) {
	const json = JSON.stringify(data);
	for (const client of clients) {
		if (client.readyState === 1) {
			// WebSocket.OPEN
			client.send(json);
		}
	}
}

function getMobileHtml(): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>cc-uui</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0a;--surface:#1a1a1a;--surface2:#252525;--border:#333;--text:#e5e5e5;--text2:#999;--primary:#6366f1;--primary-dim:rgba(99,102,241,.15);--radius:12px;--max-w:680px}
@media(prefers-color-scheme:light){:root{--bg:#fafafa;--surface:#fff;--surface2:#f5f5f5;--border:#e5e5e5;--text:#171717;--text2:#666;--primary:#6366f1;--primary-dim:rgba(99,102,241,.1)}}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text);height:100dvh;display:flex;flex-direction:column}
#header{padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;font-weight:600;font-size:15px;position:relative}
#header .dot{width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0}
#header .dot.off{background:#ef4444}
#session-btn{margin-left:auto;padding:4px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:12px;cursor:pointer;font-weight:500;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#session-btn:after{content:" \\25BE";font-size:10px}
#session-drawer{position:absolute;top:100%;left:0;right:0;background:var(--surface);border-bottom:1px solid var(--border);max-height:50vh;overflow-y:auto;display:none;z-index:10;box-shadow:0 8px 24px rgba(0,0,0,.3)}
#session-drawer.open{display:block}
.sess-item{padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px;display:flex;align-items:center;gap:8px}
.sess-item:last-child{border-bottom:none}
.sess-item:hover{background:var(--surface2)}
.sess-item.active{background:var(--primary-dim);font-weight:600}
.sess-item .sess-title{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#messages{flex:1;overflow-y:auto;padding:12px 12px 0}
.msg{max-width:var(--max-w);margin:0 auto 12px;display:flex;flex-direction:column}
.msg.user{align-items:flex-end}
.msg.assistant{align-items:flex-start}
.bubble{padding:10px 14px;border-radius:var(--radius);font-size:14px;line-height:1.55;white-space:pre-wrap;word-break:break-word;max-width:85%}
.msg.user .bubble{background:var(--primary);color:#fff;border-bottom-right-radius:4px}
.msg.assistant .bubble{background:var(--surface);border:1px solid var(--border);border-bottom-left-radius:4px}
.tool-block{margin:6px 0;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:12px;cursor:pointer}
.tool-block summary{font-weight:600;color:var(--primary);cursor:pointer;font-size:13px}
.tool-block pre{margin-top:6px;white-space:pre-wrap;word-break:break-word;color:var(--text2);font-family:monospace;font-size:11px;max-height:200px;overflow-y:auto}
.thinking-block{margin:6px 0;padding:8px 12px;background:var(--surface2);border-left:3px solid var(--primary);border-radius:0 8px 8px 0;font-size:12px}
.thinking-block summary{font-weight:600;color:var(--text2);cursor:pointer;font-size:13px}
.thinking-block pre{margin-top:6px;white-space:pre-wrap;word-break:break-word;color:var(--text2);font-family:monospace;font-size:11px;max-height:200px;overflow-y:auto}
.typing{display:flex;gap:4px;padding:10px 14px}
.typing span{width:6px;height:6px;border-radius:50%;background:var(--text2);animation:bounce 1.4s infinite both}
.typing span:nth-child(2){animation-delay:.2s}
.typing span:nth-child(3){animation-delay:.4s}
@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
#input-bar{padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;max-width:var(--max-w);margin:0 auto;width:100%}
#input-bar input{flex:1;padding:10px 14px;border-radius:var(--radius);border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px;outline:none}
#input-bar input:focus{border-color:var(--primary)}
#input-bar button{padding:10px 18px;border-radius:var(--radius);border:none;background:var(--primary);color:#fff;font-weight:600;font-size:14px;cursor:pointer}
#input-bar button:disabled{opacity:.5;cursor:default}
</style>
</head>
<body>
<div id="header">
  <div class="dot" id="status-dot"></div>
  <span>cc-uui</span>
  <button id="session-btn">Chats</button>
  <div id="session-drawer"></div>
</div>
<div id="messages"></div>
<div id="input-bar">
  <input id="msg-input" placeholder="Send a message..." autocomplete="off">
  <button id="send-btn">Send</button>
</div>
<script>
var msgContainer=document.getElementById("messages");
var msgInput=document.getElementById("msg-input");
var sendBtn=document.getElementById("send-btn");
var statusDot=document.getElementById("status-dot");
var sessionBtn=document.getElementById("session-btn");
var sessionDrawer=document.getElementById("session-drawer");
var streaming=false;
var ws=null;
var currentSessions=[];
var currentActiveId=null;

sessionBtn.addEventListener("click",function(e){
  e.stopPropagation();
  sessionDrawer.classList.toggle("open");
});
document.addEventListener("click",function(){
  sessionDrawer.classList.remove("open");
});

function connect(){
  var proto=location.protocol==="https:"?"wss:":"ws:";
  var params=new URLSearchParams(location.search);
  ws=new WebSocket(proto+"//"+location.host+"/ws?token="+encodeURIComponent(params.get("token")));
  ws.onopen=function(){statusDot.className="dot"};
  ws.onclose=function(){statusDot.className="dot off";setTimeout(connect,3000)};
  ws.onmessage=function(e){handle(JSON.parse(e.data))};
}
connect();

function handle(data){
  if(data.type==="init"){
    msgContainer.innerHTML="";
    for(var i=0;i<data.messages.length;i++)renderMessage(data.messages[i]);
    if(data.sessions)updateSessionDrawer(data.sessions,data.activeSessionId);
    scrollBottom();
  }else if(data.type==="chunk"){
    handleChunk(data.chunk);
  }else if(data.type==="sessions"){
    updateSessionDrawer(data.sessions,data.activeSessionId);
  }else if(data.type==="switch"){
    msgContainer.innerHTML="";
    for(var i=0;i<data.messages.length;i++)renderMessage(data.messages[i]);
    updateSessionDrawer(data.sessions,data.activeSessionId);
    scrollBottom();
  }
}

function updateSessionDrawer(list,activeId){
  currentSessions=list||[];
  currentActiveId=activeId;
  var html="";
  for(var i=0;i<currentSessions.length;i++){
    var s=currentSessions[i];
    var cls="sess-item"+(s.id===activeId?" active":"");
    html+="<div class=\\""+cls+"\\" data-id=\\""+s.id+"\\"><span class=\\"sess-title\\">"+esc(s.title)+"</span></div>";
  }
  sessionDrawer.innerHTML=html;
  var active=list&&list.find(function(x){return x.id===activeId});
  sessionBtn.textContent=active?active.title:"Chats";
  var items=sessionDrawer.querySelectorAll(".sess-item");
  for(var i=0;i<items.length;i++){
    items[i].addEventListener("click",function(e){
      e.stopPropagation();
      sessionDrawer.classList.remove("open");
      ws.send(JSON.stringify({type:"switch_session",sessionId:this.getAttribute("data-id")}));
    });
  }
}

var currentAssistantEl=null;
var currentParts=[];

function renderMessage(msg){
  var div=document.createElement("div");
  div.className="msg "+msg.role;
  var bubble=document.createElement("div");
  bubble.className="bubble";
  var html="";
  for(var i=0;i<msg.parts.length;i++){
    var p=msg.parts[i];
    if(p.type==="text")html+=esc(p.text);
    else if(p.type==="tool_use")html+="<details class=\\"tool-block\\"><summary>"+esc(p.toolName)+"</summary><pre>"+esc(p.toolInput)+"</pre></details>";
    else if(p.type==="tool_result")html+="<details class=\\"tool-block\\"><summary>Result</summary><pre>"+esc(p.output)+"</pre></details>";
    else if(p.type==="thinking")html+="<details class=\\"thinking-block\\"><summary>Thinking</summary><pre>"+esc(p.text)+"</pre></details>";
  }
  bubble.innerHTML=html;
  div.appendChild(bubble);
  msgContainer.appendChild(div);
}

function handleChunk(chunk){
  if(chunk.type==="text"){
    if(!streaming){streaming=true;currentParts=[];startAssistantBubble()}
    currentParts.push({type:"text",text:chunk.text});
    renderStreamingBubble();scrollBottom();
  }else if(chunk.type==="thinking"){
    if(!streaming){streaming=true;currentParts=[];startAssistantBubble()}
    currentParts.push({type:"thinking",text:chunk.text});
    renderStreamingBubble();scrollBottom();
  }else if(chunk.type==="tool_use"){
    currentParts.push(chunk);renderStreamingBubble();
  }else if(chunk.type==="tool_result"){
    currentParts.push(chunk);renderStreamingBubble();scrollBottom();
  }else if(chunk.type==="done"||chunk.type==="error"){
    if(streaming){streaming=false;var el=document.getElementById("streaming-msg");if(el)el.removeAttribute("id");currentAssistantEl=null;currentParts=[]}
    if(chunk.type==="error"){
      var div=document.createElement("div");div.className="msg assistant";
      var bubble=document.createElement("div");bubble.className="bubble";bubble.style.color="#ef4444";
      bubble.textContent="Error: "+chunk.error;div.appendChild(bubble);msgContainer.appendChild(div);scrollBottom();
    }
    sendBtn.disabled=false;
  }
}

function startAssistantBubble(){
  var div=document.createElement("div");div.className="msg assistant";div.id="streaming-msg";
  var bubble=document.createElement("div");bubble.className="bubble";
  div.appendChild(bubble);msgContainer.appendChild(div);currentAssistantEl=div;
}

function renderStreamingBubble(){
  if(!currentAssistantEl)return;
  var bubble=currentAssistantEl.querySelector(".bubble");if(!bubble)return;
  var html="";var textBuf="";
  for(var i=0;i<currentParts.length;i++){
    var p=currentParts[i];
    if(p.type==="text"){textBuf+=esc(p.text)}
    else{
      if(textBuf){html+=textBuf;textBuf=""}
      if(p.type==="tool_use")html+="<details class=\\"tool-block\\"><summary>"+esc(p.toolName)+"</summary><pre>"+esc(p.toolInput)+"</pre></details>";
      else if(p.type==="tool_result")html+="<details class=\\"tool-block\\"><summary>Result</summary><pre>"+esc(p.output)+"</pre></details>";
      else if(p.type==="thinking")html+="<details class=\\"thinking-block\\"><summary>Thinking</summary><pre>"+esc(p.text)+"</pre></details>";
    }
  }
  if(textBuf)html+=textBuf;
  if(streaming)html+="<div class=\\"typing\\"><span></span><span></span><span></span></div>";
  bubble.innerHTML=html;
}

function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function scrollBottom(){msgContainer.scrollTop=msgContainer.scrollHeight}

sendBtn.addEventListener("click",send);
msgInput.addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}});

function send(){
  var text=msgInput.value.trim();if(!text||streaming)return;
  msgInput.value="";sendBtn.disabled=true;
  var div=document.createElement("div");div.className="msg user";
  var bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=text;
  div.appendChild(bubble);msgContainer.appendChild(div);scrollBottom();
  ws.send(JSON.stringify({type:"send",text:text}));
}
<\/script>
</body>
</html>`;
}

export async function startMobileServer(
	port: number,
): Promise<{ token: string; url: string; qrSvg: string }> {
	stopMobileServer();

	authToken = generateToken();
	const lanIp = getLanIp();
	const url = `http://${lanIp}:${port}?token=${authToken}`;

	let qrSvg = "";
	try {
		qrSvg = await QRCode.toString(url, { type: "svg", width: 256 });
	} catch {
		qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#fff" width="100" height="100"/><text x="50" y="55" text-anchor="middle" font-size="10" fill="#333">QR failed</text></svg>`;
	}

	server = Bun.serve({
		port,
		hostname: "0.0.0.0",
		fetch(req, srv) {
			const url = new URL(req.url);

			// WebSocket upgrade
			if (url.pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
				if (!validateWsAuth(req)) {
					return new Response("Unauthorized", { status: 401 });
				}
				const upgraded = srv.upgrade(req, { data: {} });
				if (upgraded) return new Response(null, { status: 101 });
				return new Response("Upgrade failed", { status: 500 });
			}

			// Auth-protected API routes
			if (url.pathname.startsWith("/api/")) {
				if (!validateAuth(req)) {
					return Response.json(
						{ error: "Unauthorized" },
						{ status: 401 },
					);
				}
				if (url.pathname === "/api/status") {
					return Response.json({
						streaming: false,
						clientCount: clients.size,
					});
				}
				if (url.pathname === "/api/sessions") {
					return Response.json({ sessions, activeSessionId });
				}
				if (url.pathname === "/api/send" && req.method === "POST") {
					return handleApiSend(req);
				}
				if (url.pathname === "/api/abort" && req.method === "POST") {
					return handleApiAbort();
				}
				return new Response("Not Found", { status: 404 });
			}

			// Serve mobile HTML for root path
			if (url.pathname === "/") {
				if (!validateAuth(req)) {
					return new Response("Unauthorized", { status: 401 });
				}
				return new Response(getMobileHtml(), {
					headers: { "content-type": "text/html; charset=utf-8" },
				});
			}

			return new Response("Not Found", { status: 404 });
		},
		websocket: {
			open(ws) {
				clients.add(ws);
				ws.send(
					JSON.stringify({
						type: "init",
						messages: currentMessages,
						sessions,
						activeSessionId,
					}),
				);
			},
			message(_ws, data) {
				try {
					const parsed = JSON.parse(data as string);
					if (
						parsed.type === "send" &&
						typeof parsed.text === "string"
					) {
						sendPromptCallback?.(parsed.text);
					} else if (
						parsed.type === "switch_session" &&
						typeof parsed.sessionId === "string"
					) {
						switchSessionCallback?.(parsed.sessionId);
					}
				} catch {
					// ignore malformed messages
				}
			},
			close(ws) {
				clients.delete(ws);
			},
		},
	});

	return { token: authToken, url, qrSvg };
}

async function handleApiSend(req: Request): Promise<Response> {
	try {
		const body = (await req.json()) as { text?: string };
		if (!body.text) {
			return Response.json(
				{ error: "text is required" },
				{ status: 400 },
			);
		}
		sendPromptCallback?.(body.text);
		return Response.json({ status: "started" });
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}
}

function handleApiAbort(): Response {
	abortCallback?.();
	return Response.json({ status: "aborted" });
}

export function stopMobileServer(): void {
	if (server) {
		for (const client of clients) {
			client.close();
		}
		clients.clear();
		server.stop();
		server = null;
		authToken = "";
		currentMessages = [];
		sessions = [];
		activeSessionId = null;
	}
}

export async function getStatus(): Promise<{
	running: boolean;
	port: number;
	url: string;
	clients: number;
	qrSvg: string;
} | null> {
	if (!server) return null;
	const lanIp = getLanIp();
	const port = server.port!;
	const url = `http://${lanIp}:${port}?token=${authToken}`;
	let qrSvg = "";
	try {
		qrSvg = await QRCode.toString(url, { type: "svg", width: 256 });
	} catch {
		qrSvg = "";
	}
	return { running: true, port, url, clients: clients.size, qrSvg };
}

export function onAgentChunk(chunk: AgentChunkPayload): void {
	broadcast({ type: "chunk", chunk });
}

export function setMessages(messages: ChatMessage[]): void {
	currentMessages = messages;
}

export function syncSessions(
	sessionList: SessionInfo[],
	activeId: string | null,
): void {
	sessions = sessionList;
	activeSessionId = activeId;
	broadcast({ type: "sessions", sessions, activeSessionId });
}

export function switchSession(
	sessionList: SessionInfo[],
	activeId: string,
	messages: ChatMessage[],
): void {
	sessions = sessionList;
	activeSessionId = activeId;
	currentMessages = messages;
	broadcast({
		type: "switch",
		sessions,
		activeSessionId,
		messages,
	});
}
