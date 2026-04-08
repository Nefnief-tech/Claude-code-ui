import { useCallback, useEffect, useRef, useState } from "react";
import { appendTextToLastPart, appendThinking } from "shared/message-utils";
import type { AgentChunkPayload, ChatMessageRPC } from "shared/rpc";

type ChatMessage = ChatMessageRPC;
type SessionInfo = { id: string; title: string };

let nextId = 0;
function uid(): string {
	return `msg-${++nextId}`;
}

export function useMobileChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [connected, setConnected] = useState(false);
	const [sessions, setSessions] = useState<SessionInfo[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const assistantIdRef = useRef<string | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const connect = useCallback(() => {
		const params = new URLSearchParams(location.search);
		const token = params.get("token");
		if (!token) return;

		const proto = location.protocol === "https:" ? "wss:" : "ws:";
		const ws = new WebSocket(`${proto}//${location.host}/ws?token=${encodeURIComponent(token)}`);
		wsRef.current = ws;

		ws.onopen = () => setConnected(true);
		ws.onclose = () => {
			setConnected(false);
			wsRef.current = null;
			reconnectTimerRef.current = setTimeout(connect, 3000);
		};
		ws.onmessage = (e) => {
			try {
				handleMessage(JSON.parse(e.data));
			} catch {
				/* ignore malformed */
			}
		};
	}, []);

	useEffect(() => {
		connect();
		return () => {
			if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
			wsRef.current?.close();
		};
	}, [connect]);

	function handleMessage(data: Record<string, unknown>) {
		switch (data.type) {
			case "init":
				setMessages((data.messages as ChatMessage[]) || []);
				if (data.sessions) {
					setSessions(data.sessions as SessionInfo[]);
					setActiveSessionId((data.activeSessionId as string) ?? null);
				}
				break;
			case "chunk":
				handleChunk(data.chunk as AgentChunkPayload);
				break;
			case "sessions":
				setSessions((data.sessions as SessionInfo[]) || []);
				setActiveSessionId((data.activeSessionId as string) ?? null);
				break;
			case "switch":
				setMessages((data.messages as ChatMessage[]) || []);
				setSessions((data.sessions as SessionInfo[]) || []);
				setActiveSessionId((data.activeSessionId as string) ?? null);
				break;
			case "desktop_message":
				if (isStreaming) break;
				{
					const userId = uid();
					const assistantId = uid();
					assistantIdRef.current = assistantId;
					setMessages((prev) => [
						...prev,
						{ id: userId, role: "user", parts: [{ type: "text", text: `[Desktop] ${data.text as string}` }] },
						{ id: assistantId, role: "assistant", parts: [] },
					]);
					setIsStreaming(true);
				}
				break;
		}
	}

	function handleChunk(chunk: AgentChunkPayload) {
		switch (chunk.type) {
			case "text":
				setMessages((prev) => {
					const id = assistantIdRef.current;
					if (!id) return prev;
					return prev.map((m) =>
						m.id === id ? { ...m, parts: appendTextToLastPart(m.parts, chunk.text) } : m,
					);
				});
				break;
			case "thinking":
				setMessages((prev) => {
					const id = assistantIdRef.current;
					if (!id) return prev;
					return prev.map((m) =>
						m.id === id ? { ...m, parts: appendThinking(m.parts, chunk.text) } : m,
					);
				});
				break;
			case "tool_use":
				setMessages((prev) => {
					const id = assistantIdRef.current;
					if (!id) return prev;
					return prev.map((m) =>
						m.id === id
							? {
									...m,
									parts: [
										...m.parts,
										{
											type: "tool_use" as const,
											toolName: chunk.toolName,
											toolInput: chunk.toolInput,
										},
									],
								}
							: m,
					);
				});
				break;
			case "tool_result":
				setMessages((prev) => {
					const id = assistantIdRef.current;
					if (!id) return prev;
					return prev.map((m) =>
						m.id === id
							? {
									...m,
									parts: [
										...m.parts,
										{
											type: "tool_result" as const,
											toolUseId: chunk.toolUseId,
											output: chunk.output,
										},
									],
								}
							: m,
					);
				});
				break;
			case "done":
				assistantIdRef.current = null;
				setIsStreaming(false);
				break;
			case "error":
				setMessages((prev) => {
					const id = assistantIdRef.current;
					if (!id) return prev;
					return prev.map((m) =>
						m.id === id
							? {
									...m,
									parts: [
										...m.parts,
										{
											type: "text" as const,
											text: `\n\nError: ${chunk.error}`,
										},
									],
								}
							: m,
					);
				});
				assistantIdRef.current = null;
				setIsStreaming(false);
				break;
		}
	}

	const sendMessage = useCallback(
		(text: string) => {
			if (!text.trim() || isStreaming) return;

			const userId = uid();
			const assistantId = uid();
			assistantIdRef.current = assistantId;

			setMessages((prev) => [
				...prev,
				{
					id: userId,
					role: "user",
					parts: [{ type: "text", text }],
				},
				{ id: assistantId, role: "assistant", parts: [] },
			]);
			setIsStreaming(true);

			wsRef.current?.send(JSON.stringify({ type: "send", text }));
		},
		[isStreaming],
	);

	const switchSession = useCallback((sessionId: string) => {
		wsRef.current?.send(JSON.stringify({ type: "switch_session", sessionId }));
	}, []);

	return {
		messages,
		isStreaming,
		connected,
		sessions,
		activeSessionId,
		sendMessage,
		switchSession,
	};
}
