import type { AgentChunkPayload, ChatMessageRPC } from "shared/rpc";
import QRCode from "qrcode";
import { networkInterfaces } from "node:os";

type ChatMessage = ChatMessageRPC;

type SessionInfo = {
	id: string;
	title: string;
};

let server: ReturnType<typeof Bun.serve> | null = null;
let authToken = "";
let currentMessages: ChatMessage[] = [];
let sessions: SessionInfo[] = [];
let activeSessionId: string | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const clients = new Set<any>();

// Path to dist/mobile/ (resolved at startup)
let mobileDir = "";

// Callbacks — set by index.ts
let sendPromptCallback: ((text: string, doContinue?: boolean) => void) | null = null;
let abortCallback: (() => void) | null = null;
let switchSessionCallback: ((sessionId: string) => void) | null = null;

export function setSendPromptCallback(cb: (text: string, doContinue?: boolean) => void) {
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

function normalizePath(p: string): string {
	const parts = p.split("/");
	const result: string[] = [];
	for (const part of parts) {
		if (part === "..") {
			result.pop();
		} else if (part !== "" && part !== ".") {
			result.push(part);
		}
	}
	return "/" + result.join("/");
}

function parentDir(p: string): string {
	const idx = p.lastIndexOf("/");
	return idx <= 0 ? "/" : p.substring(0, idx);
}

async function findMobileDir(): Promise<string> {
	// When running from ASAR, argv[1] is a temp file. Use execPath (the bun binary) instead.
	// execPath: /path/to/project/build/dev-linux-x64/app/bin/bun
	// We walk up to find the project root with dist/mobile/
	const startPoints = [
		normalizePath(parentDir(process.execPath || "")),
		normalizePath(parentDir(process.argv[1] || "")),
	];

	for (const start of startPoints) {
		let dir = start;
		for (let i = 0; i < 10; i++) {
			const candidate = `${dir}/dist/mobile/index.html`;
			const file = Bun.file(candidate);
			if (await file.exists()) {
				return `${dir}/dist/mobile`;
			}
			const parent = parentDir(dir);
			if (parent === dir) break;
			dir = parent;
		}
	}
	return "";
}

const CONTENT_TYPES: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".ico": "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
};

function getContentType(filePath: string): string {
	const dotIdx = filePath.lastIndexOf(".");
	const ext = dotIdx >= 0 ? filePath.substring(dotIdx) : "";
	return CONTENT_TYPES[ext] || "application/octet-stream";
}

export async function startMobileServer(
	port: number,
): Promise<{ token: string; url: string; qrSvg: string }> {
	stopMobileServer();

	mobileDir = await findMobileDir();
	console.log("[mobile] dist path:", mobileDir || "(not found)");

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
		async fetch(req, srv) {
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

			// Serve mobile app assets (no auth needed — harmless without WS connection)
			if (!mobileDir) {
				return new Response(
					"Mobile app not built. Run `vite build` first.",
					{ status: 503 },
				);
			}

			// Serve static assets
			if (url.pathname.startsWith("/assets/")) {
				const fileName = url.pathname.substring("/assets/".length);
				// Prevent path traversal
				if (fileName.includes("..") || fileName.includes("/")) {
					return new Response("Not Found", { status: 404 });
				}
				const filePath = `${mobileDir}/assets/${fileName}`;
				const file = Bun.file(filePath);
				if (await file.exists()) {
					return new Response(file, {
						headers: { "content-type": getContentType(filePath) },
					});
				}
				return new Response("Not Found", { status: 404 });
			}

			// Serve index.html (auth required — this is the app entry point)
			if (!validateAuth(req)) {
				return new Response("Unauthorized", { status: 401 });
			}

			const indexPath = `${mobileDir}/index.html`;
			const indexFile = Bun.file(indexPath);
			if (await indexFile.exists()) {
				return new Response(indexFile, {
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
		mobileDir = "";
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

export function notifyDesktopMessage(text: string): void {
	broadcast({ type: "desktop_message", text });
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
