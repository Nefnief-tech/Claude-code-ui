import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ChatMessage, MessagePart } from "@/lib/use-agent-chat";
import type { SkillInfo } from "@/lib/use-skills";
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// --- TodoWrite / TaskCreate / TaskUpdate rendering ---

type TodoItem = {
	content: string;
	status: "pending" | "in_progress" | "completed";
	activeForm?: string;
};

export function TodoListBlock({ input }: { input: string }) {
	let parsed: { todos?: TodoItem[] } | null = null;
	try { parsed = JSON.parse(input); } catch { /* not JSON */ }
	const todos = parsed?.todos || [];

	if (todos.length === 0) return null;

	const completed = todos.filter(t => t.status === "completed").length;

	return (
		<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/50 overflow-hidden" style={{ color: "var(--foreground)" }}>
			<div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: "var(--primary)" }}>
					<path d="M12 6h6" /><path d="M12 12h6" /><path d="M12 18h6" /><path d="M3 12h.01" /><path d="M3 18h.01" /><path d="M3 6h.01" />
				</svg>
				<span className="text-xs font-medium">Tasks</span>
				<span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{completed}/{todos.length}</span>
			</div>
			<div className="py-1">
				{todos.map((todo, i) => (
					<div key={i} className="flex items-start gap-2.5 px-3 py-1.5" style={{ opacity: todo.status === "completed" ? 0.4 : todo.status === "pending" ? 0.6 : 1 }}>
						<span className="mt-0.5 shrink-0">
							{todo.status === "completed" ? (
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#22c55e" }}>
									<path d="M20 6 9 17l-5-5" />
								</svg>
							) : todo.status === "in_progress" ? (
								<span className="flex h-3.5 w-3.5 items-center justify-center">
									<span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: "var(--primary)" }} />
								</span>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--muted-foreground)", opacity: 0.5 }}>
									<circle cx="12" cy="12" r="10" />
								</svg>
							)}
						</span>
						<div className="min-w-0">
							<div className={cn(
								"text-xs leading-relaxed",
								todo.status === "completed" && "line-through",
								todo.status === "in_progress" && "font-semibold",
							)}>
									{todo.activeForm && todo.status === "in_progress" ? todo.activeForm : todo.content}
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// --- AskUserQuestion rendering ---

export function AskQuestionBlock({ input, result, onAnswer }: { input: string; result?: string; onAnswer?: (answer: string) => void }) {
	let parsed: { questions?: Array<{ question: string; header?: string; options?: Array<{ label: string; description?: string }>; multiSelect?: boolean }> } | null = null;
	try { parsed = JSON.parse(input); } catch { /* not JSON */ }
	const questions = parsed?.questions || [];

	// For multiSelect questions, value is a comma-joined string of labels; for single-select, a single label
	const [selections, setSelections] = useState<Record<number, string>>({});
	const [submitted, setSubmitted] = useState(false);

	// Try to find chosen answers from the result
	let answers: Record<string, string> = {};
	if (result || submitted) {
		try {
			const parsedResult = JSON.parse(result || "{}");
			if (typeof parsedResult === "object" && parsedResult !== null) {
				answers = parsedResult as Record<string, string>;
			}
		} catch {
			for (const q of questions) {
				if (q.options) {
					const match = q.options.find(o => o.label.toLowerCase() === (result || "").trim().toLowerCase());
					if (match) answers[q.question] = match.label;
				}
			}
		}
		// Also fold in local selections for display
		for (const [qi, label] of Object.entries(selections)) {
			const q = questions[Number(qi)];
			if (q) answers[q.question] = label;
		}
	}

	const interactive = !!onAnswer && !submitted;
	const allAnswered = interactive && questions.every((_, qi) => selections[qi] !== undefined);

	const toggleOption = (qi: number, label: string, multiSelect?: boolean) => {
		setSelections((s) => {
			const current = s[qi];
			if (multiSelect) {
				const parts = current ? current.split(", ") : [];
				if (parts.includes(label)) {
					const next = parts.filter((p) => p !== label);
					if (next.length === 0) {
						const { [qi]: _, ...rest } = s;
						return rest;
					}
					return { ...s, [qi]: next.join(", ") };
				}
				return { ...s, [qi]: [...parts, label].join(", ") };
			}
			// single select
			return { ...s, [qi]: label };
		});
	};

	const handleSubmit = () => {
		if (!allAnswered || !onAnswer) return;
		const lines = questions.map((q, qi) => {
			const answer = selections[qi];
			return `${q.question}\n${answer}`;
		});
		setSubmitted(true);
		onAnswer(lines.join("\n\n"));
	};

	if (questions.length === 0) return null;

	return (
		<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/50 overflow-hidden" style={{ color: "var(--foreground)" }}>
			<div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: "var(--primary)" }}>
					<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
				</svg>
				<span className="text-xs font-medium">Question</span>
			</div>
			<div className="p-3 space-y-3">
				{questions.map((q, qi) => {
					const chosenAnswer = answers[q.question];
					return (
						<div key={qi}>
							{q.header && (
								<span className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium mb-1.5" style={{ backgroundColor: "color-mix(in oklch, var(--primary) 15%, transparent)", color: "var(--primary)" }}>{q.header}</span>
							)}
							<div className="text-xs mb-2">{q.question}</div>
							{q.options && q.options.length > 0 && (
								<div className="space-y-1.5">
									{q.options.map((opt, oi) => {
										const chosenParts = (chosenAnswer || "").split(", ").map((p: string) => p.toLowerCase());
										const isChosen = chosenParts.includes(opt.label.toLowerCase());
										return (
											<div
												key={oi}
												onClick={interactive ? () => toggleOption(qi, opt.label, q.multiSelect) : undefined}
												className={cn(
													"rounded-md border px-2.5 py-1.5 text-xs transition-colors",
													interactive && "cursor-pointer hover:border-primary/60 hover:bg-primary/5",
												)}
												style={{
													borderColor: isChosen ? "var(--primary)" : "var(--border)",
													backgroundColor: isChosen ? "color-mix(in oklch, var(--primary) 15%, transparent)" : "var(--background)",
													opacity: isChosen ? 1 : 0.85,
												}}
											>
												<div className="flex items-center gap-1.5">
													{isChosen && (
														<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: "var(--primary)" }}>
															<path d="M20 6 9 17l-5-5" />
														</svg>
													)}
													<span className={cn("font-medium", isChosen && "font-semibold")} style={{ color: isChosen ? "var(--primary)" : "inherit" }}>{opt.label}</span>
												</div>
												{opt.description && (
													<div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{opt.description}</div>
												)}
											</div>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
				{interactive && (
					<button
						type="button"
						onClick={handleSubmit}
						disabled={!allAnswered}
						className="w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40 disabled:pointer-events-none"
					>
						Submit Answers
					</button>
				)}
			</div>
		</div>
	);
}

// --- Agent tool rendering ---

export function AgentBlock({ input, result }: { input: string; result?: string }) {
	const [open, setOpen] = useState(false);

	let parsed: { description?: string; prompt?: string; subagent_type?: string; name?: string; run_in_background?: boolean } | null = null;
	try { parsed = JSON.parse(input); } catch { /* not JSON */ }

	const description = parsed?.description || parsed?.prompt?.slice(0, 80) || "Subagent";
	const subagentType = parsed?.subagent_type || "";
	const agentName = parsed?.name || "";
	const isBackground = parsed?.run_in_background || false;
	const isRunning = !result;

	// Extract a concise result summary (first few non-empty lines)
	let resultText = "";
	if (result) {
		try {
			// Tool results may be wrapped in JSON
			const r = JSON.parse(result);
			resultText = typeof r === "string" ? r : result;
		} catch {
			resultText = result;
		}
	}

	return (
		<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/50 overflow-hidden" style={{ color: "var(--foreground)" }}>
			<div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: "var(--primary)" }}>
					<path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
				</svg>
				<span className="text-xs font-medium">Subagent</span>
				{subagentType && (
					<span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "color-mix(in oklch, var(--primary) 15%, transparent)", color: "var(--primary)" }}>{subagentType}</span>
				)}
				{agentName && (
					<span className="text-[10px] text-muted-foreground">{agentName}</span>
				)}
				{isBackground && (
					<span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "color-mix(in oklch, var(--muted-foreground) 15%, transparent)", color: "var(--muted-foreground)" }}>bg</span>
				)}
				<span className="flex-1" />
				{isRunning ? (
					<span className="flex items-center gap-1.5">
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: "var(--primary)" }} />
						<span className="text-[10px] text-muted-foreground">Running...</span>
					</span>
				) : (
					<span className="flex items-center gap-1.5">
						<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#22c55e" }}>
							<path d="M20 6 9 17l-5-5" />
						</svg>
						<span className="text-[10px]" style={{ color: "#22c55e" }}>Completed</span>
					</span>
				)}
			</div>
			<div className="px-3 py-1.5 text-xs text-muted-foreground truncate">
				{description}
			</div>
			{resultText && (
				<div className="border-t border-border/40">
					<button
						type="button"
						onClick={() => setOpen(!open)}
						className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
							fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
							className={cn("transition-transform shrink-0", open && "rotate-90")}
						>
							<path d="m9 18 6-6-6-6" />
						</svg>
						<span className="font-medium">Result</span>
					</button>
					{open && (
						<div className="max-h-64 overflow-y-auto border-t border-border/30 bg-background/50 p-3 text-xs leading-relaxed">
							<MarkdownContent content={resultText} />
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export function ToolUseBlock({ part, result, onAnswer }: { part: Extract<MessagePart, { type: "tool_use" }>; result?: string; onAnswer?: (answer: string) => void }) {
	const [open, setOpen] = useState(part.toolName === "Edit" || part.toolName === "Write");

	// Route TodoWrite to custom renderer
	if (part.toolName === "TodoWrite" || part.toolName === "TodoRead") {
		return <TodoListBlock input={part.toolInput} />;
	}

	// Route AskUserQuestion to custom renderer
	if (part.toolName === "AskUserQuestion") {
		return <AskQuestionBlock input={part.toolInput} result={result} onAnswer={onAnswer} />;
	}

	// Route Agent to custom renderer
	if (part.toolName === "Agent") {
		return <AgentBlock input={part.toolInput} result={result} />;
	}

	let parsed: Record<string, unknown> | null = null;
	try { parsed = JSON.parse(part.toolInput); } catch { /* not JSON */ }

	// Show inline diff preview for Edit tool
	if (part.toolName === "Edit" && parsed) {
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
	if (part.toolName === "Write" && parsed) {
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


export function ThinkingBlock({ part }: { part: Extract<MessagePart, { type: "thinking" }> }) {
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

export type ToolCallInfo = {
	toolName: string;
	toolInput: string;
	result?: string;
};

export type ProcessedPart =
	| { type: "text"; text: string }
	| { type: "thinking"; text: string }
	| { type: "tool_call"; call: ToolCallInfo }
	| { type: "tool_group"; calls: ToolCallInfo[] };

export function processParts(parts: MessagePart[]): ProcessedPart[] {
	// Step 1: Pair each tool_use with its following tool_result
	const paired: Array<
		| { type: "text"; text: string }
		| { type: "thinking"; text: string }
		| ToolCallInfo
	> = [];
	let pendingUse: { toolName: string; toolInput: string } | null = null;

	for (const part of parts) {
		switch (part.type) {
			case "tool_use":
				if (pendingUse) paired.push(pendingUse);
				pendingUse = { toolName: part.toolName, toolInput: part.toolInput };
				break;
			case "tool_result":
				if (pendingUse) {
					paired.push({ ...pendingUse, result: part.output });
					pendingUse = null;
				}
				break;
			default:
				if (pendingUse) {
					paired.push(pendingUse);
					pendingUse = null;
				}
				paired.push(part);
				break;
		}
	}
	if (pendingUse) paired.push(pendingUse);

	// Step 2: Group consecutive non-Edit/Write tool calls into one block
	const result: ProcessedPart[] = [];
	for (const item of paired) {
		const isToolCall = "toolName" in item;
		const isProminent = isToolCall && (
			item.toolName === "Edit" ||
			item.toolName === "Write" ||
			item.toolName === "TodoWrite" ||
			item.toolName === "AskUserQuestion" ||
			item.toolName === "Agent"
		);

		if (isToolCall && !isProminent) {
			const last = result[result.length - 1];
			if (last?.type === "tool_group") {
				last.calls.push(item);
			} else {
				result.push({ type: "tool_group", calls: [item] });
			}
		} else if (isToolCall) {
			result.push({ type: "tool_call", call: item });
		} else {
			result.push(item);
		}
	}
	return result;
}

function getToolLabel(call: ToolCallInfo): string {
	let parsed: Record<string, unknown> | null = null;
	try { parsed = JSON.parse(call.toolInput); } catch { /* not JSON */ }
	const p = parsed || {};
	if (p.file_path) return String(p.file_path).split("/").pop() || String(p.file_path);
	if (p.command) return String(p.command).slice(0, 60);
	if (p.pattern) return String(p.pattern);
	return "";
}

export function ToolGroupBlock({ calls }: { calls: ToolCallInfo[] }) {
	const [open, setOpen] = useState(false);
	const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

	const toolTypes = [...new Set(calls.map((c) => c.toolName))];
	const typeLabel = toolTypes.join(" \u00b7 ");

	return (
		<div className="my-1.5 rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
					fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
					className={cn("transition-transform", open && "rotate-90")}
				>
					<path d="m9 18 6-6-6-6" />
				</svg>
				<span className="font-mono font-medium">{calls.length} operations</span>
				<span className="text-muted-foreground/50">{typeLabel}</span>
			</button>
			{open && (
				<div className="border-t border-border/40 bg-background/30">
					{calls.map((call, i) => {
						const isExpanded = expandedIdx === i;
						const label = getToolLabel(call);
						return (
							<div key={i} className="border-t border-border/30 first:border-t-0">
								<button
									type="button"
									onClick={() => setExpandedIdx(isExpanded ? null : i)}
									className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
										fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
										className={cn("transition-transform shrink-0", isExpanded && "rotate-90")}
									>
										<path d="m9 18 6-6-6-6" />
									</svg>
									<span className="font-mono shrink-0">{call.toolName}</span>
									<span className="truncate text-muted-foreground/60">{label}</span>
								</button>
								{isExpanded && (
									<pre className="max-h-48 overflow-auto border-t border-border/30 bg-background/50 p-2 text-xs font-mono leading-relaxed">
										{call.result || call.toolInput}
									</pre>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

export function CodeBlock({ children }: { children: React.ReactNode }) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(() => {
		const codeEl = (children as React.ReactElement<{ children?: React.ReactNode }>)?.props?.children;
		const text = typeof codeEl === "string" ? codeEl : "";
		navigator.clipboard.writeText(text).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}, [children]);

	return (
		<div className="group relative my-2">
			<pre className="overflow-x-auto rounded-lg border border-border/60 bg-background/80 p-3 text-[13px] font-mono leading-relaxed">
				{children}
			</pre>
			<button
				type="button"
				onClick={handleCopy}
				className="absolute top-2 right-2 rounded-md border border-border/60 bg-secondary/80 px-1.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
				title="Copy code"
			>
				{copied ? (
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M20 6 9 17l-5-5" />
					</svg>
				) : (
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
						<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
					</svg>
				)}
			</button>
		</div>
	);
}

export function MarkdownContent({ content }: { content: string }) {
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
					<CodeBlock>{children}</CodeBlock>
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

export function groupMessages(messages: ChatMessage[]): ChatMessage[][] {
	const groups: ChatMessage[][] = [];
	for (const msg of messages) {
		const lastGroup = groups[groups.length - 1];
		if (lastGroup && lastGroup[0].role === msg.role) {
			lastGroup.push(msg);
		} else {
			groups.push([msg]);
		}
	}
	return groups;
}

export const MessageBubble = React.memo(function MessageBubble({ messages, onAnswer }: { messages: ChatMessage[]; onAnswer?: (answer: string) => void }) {
	const isUser = messages[0].role === "user";
	const allParts = messages.flatMap((m) => m.parts);
	const isEmpty = allParts.length === 0 && !isUser;
	const processed = isUser ? null : processParts(allParts);

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-3 ${
					isUser
						? "bg-primary text-primary-foreground rounded-br-md"
						: "bg-secondary/60 text-foreground rounded-bl-md"
				}`}
			>
				{isEmpty && (
					<div className="flex items-center gap-1.5">
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/30" />
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/30 [animation-delay:0.2s]" />
						<span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/30 [animation-delay:0.4s]" />
					</div>
				)}
				{isUser ? allParts.map((part, i) => {
					if (part.type === "text") {
						return (
							<div key={i} className="whitespace-pre-wrap text-[14px] leading-relaxed">
								{part.text}
							</div>
						);
					}
					return null;
				}) : (processed ?? []).map((part, i) => {
					switch (part.type) {
						case "text":
							return (
								<div key={i} className="text-[14px]">
									<MarkdownContent content={part.text} />
								</div>
							);
						case "thinking":
							return <ThinkingBlock key={i} part={part} />;
						case "tool_call":
							return <ToolUseBlock key={i} part={{ type: "tool_use" as const, toolName: part.call.toolName, toolInput: part.call.toolInput }} result={part.call.result} onAnswer={onAnswer} />;
						case "tool_group":
							return <ToolGroupBlock key={i} calls={part.calls} />;
					}
				})}
			</div>
		</div>
	);
});

export const ChatView = React.forwardRef(function ChatView({
	messages,
	isStreaming,
	sendMessage,
	abort,
	showGitPanel,
	onToggleGitPanel,
	hasGitChanges,
	skills,
	onGetSkillContent,
	sessionCost,
	estimatedTokens,
}: {
	messages: ChatMessage[];
	isStreaming: boolean;
	sendMessage: (text: string, cwd?: string, skillContent?: string, skillName?: string) => void;
	abort: () => void;
	showGitPanel?: boolean;
	onToggleGitPanel?: () => void;
	hasGitChanges?: boolean;
	skills: SkillInfo[];
	onGetSkillContent: (directory: string) => Promise<string>;
	sessionCost: number;
	estimatedTokens: number;
}, ref: React.Ref<{ focusInput: () => void }>) {
	const [activeSkill, setActiveSkill] = useState<SkillInfo | null>(null);
	const [skillContent, setSkillContent] = useState<string>("");
	const [showPicker, setShowPicker] = useState(false);
	const [pickerIndex, setPickerIndex] = useState(0);
	const [pickerSkills, setPickerSkills] = useState<SkillInfo[]>([]);
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useImperativeHandle(ref, () => ({
		focusInput: () => inputRef.current?.focus(),
	}), []);

	const getInputValue = useCallback(() => inputRef.current?.value ?? "", []);

	const resizeTextarea = useCallback(() => {
		const el = inputRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
	}, []);

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

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		updatePicker(e.target.value);
		resizeTextarea();
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
				return;
			} else if (e.key === "Escape") {
				e.preventDefault();
				setShowPicker(false);
			}
		}
		// Enter submits, Shift+Enter inserts newline
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit(e);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const value = getInputValue();
		if (!value.trim()) return;
		sendMessage(value.trim(), undefined, skillContent || undefined, activeSkill?.name);
		if (inputRef.current) {
			inputRef.current.value = "";
			inputRef.current.style.height = "auto";
		}
		clearSkill();
	};

	const handleAnswer = useCallback((answer: string) => {
		if (isStreaming) abort();
		// Use setTimeout to let abort state settle before sending
		setTimeout(() => sendMessage(answer), 50);
	}, [isStreaming, abort, sendMessage]);

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
						{groupMessages(messages).map((group) => (
							<MessageBubble key={group[0].id} messages={group} onAnswer={handleAnswer} />
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
						<textarea
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
							rows={1}
							className="flex-1 resize-none overflow-hidden rounded-xl border border-border/60 bg-secondary/30 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus-visible:bg-secondary/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50"
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
					{(sessionCost > 0 || estimatedTokens > 0) && (
						<div className="flex items-center justify-end gap-2 text-[11px] text-muted-foreground/50 pt-1">
							{sessionCost > 0 && <span>${sessionCost.toFixed(4)}</span>}
							{sessionCost > 0 && estimatedTokens > 0 && <span>·</span>}
							{estimatedTokens > 0 && <span>~{estimatedTokens >= 1000 ? `${(estimatedTokens / 1000).toFixed(1)}k` : Math.round(estimatedTokens)} tokens</span>}
						</div>
					)}
				</form>
			</div>
		</div>
	);
});
