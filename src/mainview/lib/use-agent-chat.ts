import { electrobun } from "@/lib/electrobun";
import type { AgentChunkPayload, ChatMessageRPC, MessagePartRPC } from "shared/rpc";
import { appendTextToLastPart, appendThinking } from "shared/message-utils";
import { useCallback, useEffect, useRef, useState } from "react";

export type MessagePart = MessagePartRPC;
export type ChatMessage = ChatMessageRPC;

let nextId = 0;
function uid(): string {
	return `msg-${++nextId}`;
}

export function useAgentChat() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isStreaming, setIsStreaming] = useState(false);
	const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
	const [sessionCost, setSessionCost] = useState(0);
	const assistantIdRef = useRef<string | null>(null);
	const activeSessionIdRef = useRef<string | null>(null);
	const credentialsRef = useRef<{ apiKey?: string; baseUri?: string }>({});
	const hasConversationRef = useRef(false);

	// Track which session we're currently viewing
	const setActiveSession = useCallback((id: string | null) => {
		activeSessionIdRef.current = id;
	}, []);

	const handleChunk = useCallback((chunk: AgentChunkPayload) => {
		// Ignore chunks if not streaming (stale from old session)
		if (!assistantIdRef.current) return;

		switch (chunk.type) {
			case "text":
				setMessages((prev) => {
					const id = assistantIdRef.current;
					if (!id) return prev;
					return prev.map((m) =>
						m.id === id
							? { ...m, parts: appendTextToLastPart(m.parts, chunk.text) }
							: m,
					);
				});
				break;
			case "thinking":
				setMessages((prev) => {
					const id = assistantIdRef.current;
					if (!id) return prev;
					return prev.map((m) =>
						m.id === id
							? { ...m, parts: appendThinking(m.parts, chunk.text) }
							: m,
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
				setSessionCost((prev) => prev + chunk.costUsd);
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
										{ type: "text" as const, text: `\n\nError: ${chunk.error}` },
									],
								}
							: m,
					);
				});
				assistantIdRef.current = null;
				setIsStreaming(false);
				break;
			case "dev_server_url":
				setDevServerUrl(chunk.url);
				break;
		}
	}, []);

	useEffect(() => {
		electrobun.rpc?.addMessageListener("agentChunk", handleChunk);
	}, [handleChunk]);

	// Handle messages initiated from mobile (register once, check streaming state via ref)
	const isStreamingRef = useRef(isStreaming);
	isStreamingRef.current = isStreaming;
	useEffect(() => {
		electrobun.rpc?.addMessageListener("mobileUserMessage", ({ text }) => {
			if (isStreamingRef.current) return;
			const userId = uid();
			const assistantId = uid();
			assistantIdRef.current = assistantId;
			setMessages((prev) => [
				...prev,
				{ id: userId, role: "user", parts: [{ type: "text", text: `[Mobile] ${text}` }] },
				{ id: assistantId, role: "assistant", parts: [] },
			]);
			setIsStreaming(true);
		});
	}, []);

	// Load messages when switching sessions
	const loadMessages = useCallback((msgs: ChatMessage[]) => {
		setMessages(msgs);
		setSessionCost(0);
		hasConversationRef.current = msgs.length > 0;
	}, []);

	const sendMessage = useCallback(
		(text: string, cwd?: string, skillContent?: string, skillName?: string) => {
			if (!text.trim() || isStreaming) return;

			const userId = uid();
			const assistantId = uid();
			assistantIdRef.current = assistantId;

			const displayText = skillName ? `/${skillName}\n\n${text}` : text;
			const agentText = skillContent
				? `${skillContent}\n\n---\n\n${text}`
				: text;

			setMessages((prev) => [
				...prev,
				{ id: userId, role: "user", parts: [{ type: "text", text: displayText }] },
				{ id: assistantId, role: "assistant", parts: [] },
			]);
			setIsStreaming(true);

			const doContinue = hasConversationRef.current;
			hasConversationRef.current = true;

			electrobun.rpc?.request.sendMessage({
				text: agentText,
				...credentialsRef.current,
				cwd,
				continue: doContinue,
			}).catch((err) => {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantId
							? {
									...m,
									parts: [
										{ type: "text", text: `Failed to send: ${err}` },
									],
								}
							: m,
					),
				);
				assistantIdRef.current = null;
				setIsStreaming(false);
			});
		},
		[isStreaming],
	);

	const abort = useCallback(() => {
		electrobun.rpc?.request.abortAgent({});
		assistantIdRef.current = null;
		setIsStreaming(false);
	}, []);

	const setCredentials = useCallback(
		(apiKey: string, baseUri: string) => {
			credentialsRef.current = {
				apiKey: apiKey || undefined,
				baseUri: baseUri || undefined,
			};
		},
		[],
	);

	// Rough token estimate: sum text lengths / 4
	const estimatedTokens = messages.reduce((total, msg) => {
		return total + msg.parts.reduce((sum, p) => {
			if (p.type === "text" || p.type === "thinking") return sum + p.text.length;
			if (p.type === "tool_use") return sum + p.toolInput.length;
			if (p.type === "tool_result") return sum + p.output.length;
			return sum;
		}, 0);
	}, 0) / 4;

	return {
		messages,
		isStreaming,
		sendMessage,
		abort,
		setCredentials,
		loadMessages,
		setActiveSession,
		devServerUrl,
		clearDevServerUrl: () => setDevServerUrl(null),
		sessionCost,
		estimatedTokens,
	};
}
