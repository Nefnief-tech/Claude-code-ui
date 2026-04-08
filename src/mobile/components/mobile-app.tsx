import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMobileChat } from "../lib/use-mobile-chat";
import { MobileChat } from "./mobile-chat";

export function MobileApp() {
	const {
		messages,
		isStreaming,
		connected,
		sessions,
		activeSessionId,
		sendMessage,
		switchSession,
	} = useMobileChat();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const drawerRef = useRef<HTMLDivElement>(null);

	const activeTitle = sessions.find((s) => s.id === activeSessionId)?.title;

	const handleSwitchSession = useCallback(
		(id: string) => {
			switchSession(id);
			setDrawerOpen(false);
		},
		[switchSession],
	);

	// Close drawer on outside click
	useEffect(() => {
		if (!drawerOpen) return;
		const handler = (e: MouseEvent) => {
			if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
				setDrawerOpen(false);
			}
		};
		document.addEventListener("click", handler);
		return () => document.removeEventListener("click", handler);
	}, [drawerOpen]);

	return (
		<div className="flex h-dvh flex-col bg-background">
			{/* Header */}
			<div className="relative flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
				<span
					className={cn(
						"inline-block h-2 w-2 shrink-0 rounded-full",
						connected ? "bg-green-500" : "bg-red-500",
					)}
				/>
				<span className="text-sm font-semibold text-foreground">cc-ui</span>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						setDrawerOpen(!drawerOpen);
					}}
					className="ml-auto max-w-[140px] truncate rounded-lg border border-border/60 bg-secondary/50 px-2.5 py-1 text-xs font-medium text-foreground"
				>
					{activeTitle || "Chats"} {" \u25BE"}
				</button>

				{/* Session drawer */}
				{drawerOpen && (
					<div
						ref={drawerRef}
						className="absolute inset-x-0 top-full z-10 max-h-[50vh] overflow-y-auto border-b border-border/60 bg-card shadow-lg"
					>
						{sessions.map((s) => (
							<button
								key={s.id}
								type="button"
								onClick={() => handleSwitchSession(s.id)}
								className={cn(
									"flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors",
									s.id === activeSessionId
										? "bg-primary/15 font-semibold text-primary"
										: "text-foreground hover:bg-accent/40",
								)}
							>
								<span className="truncate">{s.title}</span>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Chat */}
			<MobileChat messages={messages} isStreaming={isStreaming} sendMessage={sendMessage} />
		</div>
	);
}
