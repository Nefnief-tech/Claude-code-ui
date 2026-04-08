import { MessageBubble, groupMessages } from "@/components/chat-view";
import type { ChatMessage } from "@/lib/use-agent-chat";
import { useCallback, useEffect, useRef, useState } from "react";

export function MobileChat({
	messages,
	isStreaming,
	sendMessage,
}: {
	messages: ChatMessage[];
	isStreaming: boolean;
	sendMessage: (text: string) => void;
}) {
	const [input, setInput] = useState("");
	const scrollRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isStreaming) return;
		sendMessage(input.trim());
		setInput("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	return (
		<>
			{/* Message list */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
				{messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center gap-3 px-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="text-primary"
								role="img"
								aria-label="Chat"
							>
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-foreground">Start a conversation</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Send a message to start chatting with Claude.
							</p>
						</div>
					</div>
				) : (
					<div className="mx-auto max-w-2xl space-y-3">
						{groupMessages(messages).map((group) => (
							<MessageBubble key={group[0].id} messages={group} />
						))}
					</div>
				)}
			</div>

			{/* Input bar */}
			<div className="border-t border-border/60 px-3 py-2.5">
				<form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl gap-2">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={isStreaming ? "Waiting for response..." : "Message Claude..."}
						disabled={isStreaming}
						className="flex-1 rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
						autoComplete="off"
					/>
					<button
						type="submit"
						disabled={isStreaming || !input.trim()}
						className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							role="img"
							aria-label="Send"
						>
							<path d="m5 12 7-7 7 7" />
							<path d="M12 19V5" />
						</svg>
					</button>
				</form>
			</div>
		</>
	);
}
