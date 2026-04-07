import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, MessagePart } from "@/lib/use-agent-chat";
import type { SkillInfo } from "@/lib/use-skills";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

function cn(...inputs: (string | false | undefined)[]) {
	return inputs.filter(Boolean).join(" ");
}

function ToolUseBlock({ part }: { part: Extract<MessagePart, { type: "tool_use" }> }) {
	const [open, setOpen] = useState(part.toolName === "Edit" || part.toolName === "Write");
	const isEdit = part.toolName === "Edit";
	const isWrite = part.toolName === "Write";

	let parsed: Record<string, unknown> | null = null;
	try { parsed = JSON.parse(part.toolInput); } catch { /* not JSON */ }

	// Show inline diff preview for Edit tool
	if (isEdit && parsed) {
		const filePath = typeof parsed.file_path === "string" ? parsed.file_path : "";
		const oldStr = typeof parsed.old_string === "string" ? parsed.old_string : "";
		const newStr = typeof parsed.new_string === "string" ? parsed.new_string : "";
		const fileName = filePath.split("/").pop() || filePath;

		return (
			<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/50 overflow-hidden">
				<button
					type="button"
					onClick={() => setOpen(!open)}
					className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={cn("transition-transform", open && "rotate-90")}
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
					<span className="text-xs opacity-50">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
					</span>
					<span className="font-mono text-xs font-medium">Edit</span>
					<span className="font-mono text-xs text-muted-foreground/60 truncate">{fileName}</span>
				</button>
				{open && (
					<div className="border-t border-border/60 bg-background/50">
						{filePath && (
							<div className="px-3 py-1.5 border-b border-border/40 text-xs font-mono text-muted-foreground truncate">
								{filePath}
							</div>
						)}
						<div className="p-3 text-xs font-mono leading-relaxed overflow-x-auto max-h-64 overflow-y-auto space-y-1">
							{oldStr.split("\n").map((line, i) => (
								<div key={`old-${i}`} className="flex">
									<span className="w-6 shrink-0 text-right text-muted-foreground/40 select-none mr-2">{i + 1}</span>
									<span className="text-red-500/80 bg-red-500/5 px-1 rounded-sm">- {line}</span>
								</div>
							))}
							{newStr.split("\n").map((line, i) => (
								<div key={`new-${i}`} className="flex">
									<span className="w-6 shrink-0 text-right text-muted-foreground/40 select-none mr-2">{i + 1}</span>
									<span className="text-green-500/80 bg-green-500/5 px-1 rounded-sm">+ {line}</span>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		);
	}

	// Show file content preview for Write tool
	if (isWrite && parsed) {
		const filePath = typeof parsed.file_path === "string" ? parsed.file_path : "";
		const content = typeof parsed.content === "string" ? parsed.content : "";
		const fileName = filePath.split("/").pop() || filePath;
		const lines = content.split("\n");
		const previewLines = lines.slice(0, 12);
		const truncated = lines.length > 12;

		return (
			<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/50 overflow-hidden">
				<button
					type="button"
					onClick={() => setOpen(!open)}
					className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={cn("transition-transform", open && "rotate-90")}
					>
						<path d="m9 18 6-6-6-6" />
					</svg>
					<span className="text-xs opacity-50">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
					</span>
					<span className="font-mono text-xs font-medium">Write</span>
					<span className="font-mono text-xs text-muted-foreground/60 truncate">{fileName}</span>
				</button>
				{open && (
					<div className="border-t border-border/60 bg-background/50">
						{filePath && (
							<div className="px-3 py-1.5 border-b border-border/40 text-xs font-mono text-muted-foreground truncate">
								{filePath}
							</div>
						)}
						<div className="p-3 text-xs font-mono leading-relaxed overflow-x-auto max-h-64 overflow-y-auto">
							{(truncated ? previewLines : lines).map((line, i) => (
								<div key={i} className="flex">
									<span className="w-6 shrink-0 text-right text-muted-foreground/40 select-none mr-2">{i + 1}</span>
									<span className="text-green-500/80 bg-green-500/5 px-1 rounded-sm">+ {line}</span>
								</div>
							))}
							{truncated && (
								<div className="text-muted-foreground/40 pl-8 mt-1">... {lines.length - 12} more lines</div>
							)}
						</div>
					</div>
				)}
			</div>
		);
	}

	// Default tool use block for other tools
	return (
		<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/50 overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn("transition-transform", open && "rotate-90")}
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="opacity-50"
				>
					<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
				</svg>
				<span className="font-mono text-xs font-medium">{part.toolName}</span>
			</button>
			{open && (
				<pre className="max-h-48 overflow-auto border-t border-border/60 bg-background/50 p-3 text-xs font-mono leading-relaxed">
					{part.toolInput}
				</pre>
			)}
		</div>
	);
}

function ToolResultBlock({ part }: { part: Extract<MessagePart, { type: "tool_result" }> }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn("transition-transform", open && "rotate-90")}
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
				<span className="text-xs">Result</span>
			</button>
			{open && (
				<pre className="max-h-48 overflow-auto border-t border-border/60 bg-background/50 p-3 text-xs font-mono leading-relaxed">
					{part.output}
				</pre>
			)}
		</div>
	);
}

function ThinkingBlock({ part }: { part: Extract<MessagePart, { type: "thinking" }> }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="my-1.5 rounded-lg border border-dashed border-border/80 bg-muted/20 overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs italic text-muted-foreground/70 hover:text-muted-foreground transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className={cn("transition-transform", open && "rotate-90")}
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
				Thinking...
			</button>
			{open && (
				<pre className="whitespace-pre-wrap border-t border-dashed border-border/80 p-3 text-xs font-mono leading-relaxed text-muted-foreground/80">
					{part.text}
				</pre>
			)}
		</div>
	);
}

function MarkdownContent({ content }: { content: string }) {
	return (
		<Markdown
			remarkPlugins={[remarkGfm]}
			components={{
				p: ({ children }) => (
					<p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
				),
				h1: ({ children }) => (
					<h1 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h1>
				),
				h2: ({ children }) => (
					<h2 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h2>
				),
				h3: ({ children }) => (
					<h3 className="mb-1.5 mt-2.5 text-sm font-semibold first:mt-0">{children}</h3>
				),
				ul: ({ children }) => (
					<ul className="mb-2 ml-4 list-disc space-y-0.5">{children}</ul>
				),
				ol: ({ children }) => (
					<ol className="mb-2 ml-4 list-decimal space-y-0.5">{children}</ol>
				),
				li: ({ children }) => (
					<li className="leading-relaxed">{children}</li>
				),
				code: ({ className, children, ...props }) => {
					const isInline = !className;
					if (isInline) {
						return (
							<code
								className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[13px]"
								{...props}
							>
								{children}
							</code>
						);
					}
					return (
						<code className={cn("font-mono text-[13px]", className)} {...props}>
							{children}
						</code>
					);
				},
				pre: ({ children }) => (
					<pre className="my-2 overflow-x-auto rounded-lg border border-border/60 bg-background/80 p-3 text-[13px] font-mono leading-relaxed">
						{children}
					</pre>
				),
				blockquote: ({ children }) => (
					<blockquote className="my-2 border-l-2 border-primary/30 pl-3 italic text-muted-foreground">
						{children}
					</blockquote>
				),
				hr: () => (
					<hr className="my-3 border-border/60" />
				),
				table: ({ children }) => (
					<div className="my-2 overflow-x-auto">
						<table className="w-full border-collapse text-[13px]">
							{children}
						</table>
					</div>
				),
				thead: ({ children }) => (
					<thead className="border-b border-border/60">{children}</thead>
				),
				th: ({ children }) => (
					<th className="px-3 py-1.5 text-left font-semibold">{children}</th>
				),
				td: ({ children }) => (
					<td className="px-3 py-1.5 border-t border-border/40">{children}</td>
				),
				a: ({ href, children }) => (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary/60 transition-colors"
					>
						{children}
					</a>
				),
				strong: ({ children }) => (
					<strong className="font-semibold">{children}</strong>
				),
				em: ({ children }) => (
					<em className="italic">{children}</em>
				),
			}}
		>
			{content}
		</Markdown>
	);
}

const MessageBubble = React.memo(function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-3 ${
					isUser
						? "bg-primary text-primary-foreground rounded-br-md"
						: "bg-secondary/60 text-foreground rounded-bl-md"
				}`}
			>
				{message.parts.length === 0 && !isUser && (
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/30" />
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/30 [animation-delay:0.2s]" />
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/30 [animation-delay:0.4s]" />
					</div>
				)}
				{message.parts.map((part, i) => {
					switch (part.type) {
						case "text":
							if (isUser) {
								return (
									<div key={i} className="whitespace-pre-wrap text-[14px] leading-relaxed">
										{part.text}
									</div>
								);
							}
							return (
								<div key={i} className="text-[14px]">
									<MarkdownContent content={part.text} />
								</div>
							);
						case "tool_use":
							return <ToolUseBlock key={i} part={part} />;
						case "tool_result":
							return <ToolResultBlock key={i} part={part} />;
						case "thinking":
							return <ThinkingBlock key={i} part={part} />;
					}
				})}
			</div>
		</div>
	);
});

export function ChatView({
	messages,
	isStreaming,
	sendMessage,
	abort,
	showGitPanel,
	onToggleGitPanel,
	hasGitChanges,
	skills,
	onGetSkillContent,
}: {
	messages: ChatMessage[];
	isStreaming: boolean;
	sendMessage: (text: string, cwd?: string, skillContent?: string) => void;
	abort: () => void;
	showGitPanel?: boolean;
	onToggleGitPanel?: () => void;
	hasGitChanges?: boolean;
	skills: SkillInfo[];
	onGetSkillContent: (directory: string) => Promise<string>;
}) {
	const [activeSkill, setActiveSkill] = useState<SkillInfo | null>(null);
	const [skillContent, setSkillContent] = useState<string>("");
	const [showPicker, setShowPicker] = useState(false);
	const [pickerIndex, setPickerIndex] = useState(0);
	const [pickerSkills, setPickerSkills] = useState<SkillInfo[]>([]);
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const getInputValue = useCallback(() => inputRef.current?.value ?? "", []);

	const scrollToBottom = useCallback(() => {
		if (scrollRef.current) {
			const viewport = scrollRef.current.querySelector(
				"[data-radix-scroll-area-viewport]",
			);
			if (viewport) {
				viewport.scrollTop = viewport.scrollHeight;
			}
		}
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	// Show/hide picker based on input
	const updatePicker = useCallback((value: string) => {
		if (value.startsWith("/") && !activeSkill) {
			const q = value.slice(1).toLowerCase();
			const filtered = skills.filter((s) => q === "" || s.name.toLowerCase().includes(q));
			if (filtered.length > 0) {
				setPickerSkills(filtered);
				setShowPicker(true);
				setPickerIndex(0);
				return;
			}
		}
		setShowPicker(false);
	}, [skills, activeSkill]);

	const selectSkill = useCallback(async (skill: SkillInfo) => {
		const content = await onGetSkillContent(skill.directory);
		setActiveSkill(skill);
		setSkillContent(content);
		setShowPicker(false);
		if (inputRef.current) inputRef.current.value = "";
		inputRef.current?.focus();
	}, [onGetSkillContent]);

	const clearSkill = useCallback(() => {
		setActiveSkill(null);
		setSkillContent("");
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		updatePicker(e.target.value);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (showPicker && pickerSkills.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setPickerIndex((i) => Math.min(i + 1, pickerSkills.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setPickerIndex((i) => Math.max(i - 1, 0));
			} else if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				selectSkill(pickerSkills[pickerIndex]);
			} else if (e.key === "Escape") {
				e.preventDefault();
				setShowPicker(false);
			}
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const value = getInputValue();
		if (!value.trim()) return;
		sendMessage(value.trim(), undefined, skillContent || undefined);
		if (inputRef.current) inputRef.current.value = "";
		clearSkill();
	};

	return (
		<div className="flex h-full flex-col overflow-hidden bg-background">
			<ScrollArea ref={scrollRef} className="flex-1 overflow-hidden">
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
							>
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
							</svg>
						</div>
						<div className="text-center">
							<p className="text-sm font-medium text-foreground">
								Start a conversation
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								Send a message to start chatting with Claude.
							</p>
						</div>
					</div>
				) : (
					<div className="mx-auto max-w-3xl space-y-4 p-6">
						{messages.map((msg) => (
							<MessageBubble key={msg.id} message={msg} />
						))}
					</div>
				)}
			</ScrollArea>

			<div className="border-t border-border/60 p-4">
				<form
					onSubmit={handleSubmit}
					className="mx-auto flex max-w-3xl flex-col gap-2"
				>
					{/* Skill picker popup */}
					{showPicker && pickerSkills.length > 0 && (
						<div className="mb-1 max-h-48 overflow-y-auto rounded-xl border border-border/60 bg-popover shadow-lg">
							{pickerSkills.map((skill, i) => (
								<button
									key={skill.directory}
									type="button"
									onClick={() => selectSkill(skill)}
									className={cn(
										"flex w-full items-start gap-2 px-3 py-2 text-left transition-colors",
										i === pickerIndex
											? "bg-accent/60 text-foreground"
											: "text-muted-foreground hover:bg-accent/30 hover:text-foreground",
									)}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="mt-0.5 shrink-0 text-muted-foreground"
									>
										<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
										<path d="M5 3v4" />
										<path d="M19 17v4" />
										<path d="M3 5h4" />
										<path d="M17 19h4" />
									</svg>
									<div className="min-w-0">
										<div className="text-sm font-medium truncate">{skill.name}</div>
										<div className="text-xs text-muted-foreground/80 truncate">{skill.description}</div>
									</div>
								</button>
							))}
						</div>
					)}

					{/* Active skill badge + input row */}
					<div className="flex items-center gap-3">
						{activeSkill && (
							<span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary shrink-0">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
								</svg>
								{activeSkill.name}
								<button
									type="button"
									onClick={clearSkill}
									className="ml-0.5 rounded-sm p-0.5 hover:bg-primary/20 transition-colors"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										width="10"
										height="10"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M18 6 6 18M6 6l12 12" />
									</svg>
								</button>
							</span>
						)}
						<Input
							ref={inputRef}
							defaultValue=""
							onChange={handleInputChange}
							onKeyDown={handleKeyDown}
							placeholder={
								isStreaming
									? "Waiting for response..."
									: activeSkill
										? `Message with ${activeSkill.name}...`
										: skills.length > 0
											? "Message Claude... (type / for skills)"
											: "Message Claude..."
							}
							disabled={isStreaming}
							className="flex-1 rounded-xl border-border/60 bg-secondary/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus-visible:bg-secondary/50"
						/>
						{isStreaming ? (
							<Button
								type="button"
								variant="destructive"
								onClick={abort}
								className="rounded-xl px-5"
							>
								Stop
							</Button>
						) : (
							<Button
								type="submit"
								disabled={isStreaming}
								className="rounded-xl px-5"
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
								>
									<path d="m5 12 7-7 7 7" />
									<path d="M12 19V5" />
								</svg>
							</Button>
						)}
						{onToggleGitPanel && (
							<button
								type="button"
								onClick={onToggleGitPanel}
								className="relative rounded-xl border border-border/60 p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								title="Toggle Git Panel"
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
								>
									<line x1="6" x2="6" y1="3" y2="15" />
									<circle cx="18" cy="6" r="3" />
									<circle cx="6" cy="18" r="3" />
									<path d="M18 9a9 9 0 0 1-9 9" />
								</svg>
								{hasGitChanges && !showGitPanel && (
									<span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
								)}
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	);
}
