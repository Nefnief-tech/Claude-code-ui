import type { MessagePartRPC } from "./rpc";

export type MessagePart = MessagePartRPC;

export function appendTextToLastPart(parts: MessagePart[], text: string): MessagePart[] {
	if (parts.length === 0) {
		return [{ type: "text", text }];
	}
	const last = parts[parts.length - 1];
	if (last.type === "text") {
		return [...parts.slice(0, -1), { type: "text", text: last.text + text }];
	}
	return [...parts, { type: "text", text }];
}

export function appendThinking(parts: MessagePart[], text: string): MessagePart[] {
	if (parts.length > 0) {
		const last = parts[parts.length - 1];
		if (last.type === "thinking") {
			return [...parts.slice(0, -1), { type: "thinking", text: last.text + text }];
		}
	}
	return [...parts, { type: "thinking", text }];
}
