import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GitStatusRPC, GitLogEntry, GitStashEntry, GhPrEntry } from "@/lib/use-git";
import { useState } from "react";

function DiffBadge({ status }: { status: GitStatusRPC }) {
	if (status.insertions === 0 && status.deletions === 0) return null;
	return (
		<span className="inline-flex items-center gap-1 text-xs font-mono">
			<span className="text-green-500 dark:text-green-400">
				+{status.insertions}
			</span>
			<span className="text-red-500 dark:text-red-400">
				-{status.deletions}
			</span>
		</span>
	);
}

function BranchBadge({
	branch,
	ahead,
	behind,
}: { branch: string; ahead: number; behind: number }) {
	return (
		<div className="flex items-center gap-2 text-xs">
			<span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-2 py-0.5 font-mono">
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
					<line x1="6" x2="6" y1="3" y2="15" />
					<circle cx="18" cy="6" r="3" />
					<circle cx="6" cy="18" r="3" />
					<path d="M18 9a9 9 0 0 1-9 9" />
				</svg>
				{branch}
			</span>
			{ahead > 0 && (
				<span className="text-green-500 dark:text-green-400">
					{ahead} ahead
				</span>
			)}
			{behind > 0 && (
				<span className="text-red-500 dark:text-red-400">
					{behind} behind
				</span>
			)}
		</div>
	);
}

function DiffView({ diff }: { diff: string }) {
	if (!diff) {
		return (
			<p className="py-4 text-center text-xs text-muted-foreground">
				No changes
			</p>
		);
	}
	return (
		<pre className="max-h-64 overflow-auto rounded-lg border border-border/60 bg-background/50 p-3 text-xs font-mono leading-relaxed">
			{diff.split("\n").map((line, i) => (
				<div
					key={i}
					className={
						line.startsWith("+") && !line.startsWith("++")
							? "text-green-600 dark:text-green-400"
							: line.startsWith("-") && !line.startsWith("--")
								? "text-red-600 dark:text-red-400"
								: line.startsWith("@@")
									? "text-blue-500 dark:text-blue-400"
									: ""
					}
				>
					{line}
				</div>
			))}
		</pre>
	);
}

function LogView({ log }: { log: GitLogEntry[] }) {
	if (log.length === 0) return null;
	return (
		<div className="space-y-1">
			{log.map((entry) => (
				<div
					key={entry.hash}
					className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/30"
				>
					<span className="shrink-0 font-mono text-muted-foreground">
						{entry.hash}
					</span>
					<span className="flex-1 truncate">{entry.message}</span>
					<span className="shrink-0 text-muted-foreground">
						{entry.date}
					</span>
				</div>
			))}
		</div>
	);
}

function StashView({
	stashList,
	onPop,
	onDrop,
	onStash,
	loading,
}: {
	stashList: GitStashEntry[];
	onPop: (index?: number) => void;
	onDrop: (index: number) => void;
	onStash: (message?: string) => void;
	loading: boolean;
}) {
	const [stashMsg, setStashMsg] = useState("");

	if (stashList.length === 0 && !loading) {
		return (
			<div>
				<div className="mb-3">
					<p className="py-4 text-center text-xs text-muted-foreground">
						No stashes
					</p>
				</div>
				<div className="flex gap-2">
					<Input
						value={stashMsg}
						onChange={(e) => setStashMsg(e.target.value)}
						placeholder="Stash message (optional)"
						className="flex-1 rounded-lg text-xs"
						disabled={loading}
					/>
					<Button
						type="button"
						onClick={() => { onStash(stashMsg || undefined); setStashMsg(""); }}
						disabled={loading}
						className="rounded-lg px-3 text-xs"
						size="sm"
					>
						Stash
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className="space-y-1 mb-3">
				{stashList.map((entry, i) => (
					<div
						key={entry.ref}
						className="flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/30"
					>
						<span className="shrink-0 font-mono text-muted-foreground">
							{"stash@{" + i + "}"}
						</span>
						<div className="flex-1 min-w-0">
							<p className="truncate">{entry.message}</p>
							{entry.branch && (
								<p className="text-muted-foreground text-[10px]">{entry.branch}</p>
							)}
						</div>
						<div className="flex shrink-0 gap-1">
							<button
								type="button"
								onClick={() => onPop(i)}
								disabled={loading}
								className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
							>
								Pop
							</button>
							<button
								type="button"
								onClick={() => onDrop(i)}
								disabled={loading}
								className="rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-destructive/10 transition-colors disabled:opacity-40"
							>
								Drop
							</button>
						</div>
					</div>
				))}
			</div>
			<div className="flex gap-2">
				<Input
					value={stashMsg}
					onChange={(e) => setStashMsg(e.target.value)}
					placeholder="Stash message (optional)"
					className="flex-1 rounded-lg text-xs"
					disabled={loading}
				/>
				<Button
					type="button"
					onClick={() => { onStash(stashMsg || undefined); setStashMsg(""); }}
					disabled={loading}
					className="rounded-lg px-3 text-xs"
					size="sm"
				>
					Stash
				</Button>
			</div>
		</div>
	);
}

function PrView({
	prList,
	onCreatePr,
	lastCommitMsg,
	loading,
}: {
	prList: GhPrEntry[];
	onCreatePr: (title: string, body?: string, base?: string, draft?: boolean) => Promise<{ success: boolean; url?: string; error?: string }>;
	lastCommitMsg: string;
	loading: boolean;
}) {
	const [showForm, setShowForm] = useState(false);
	const [title, setTitle] = useState("");
	const [body, setBody] = useState("");
	const [baseBranch, setBaseBranch] = useState("");
	const [isDraft, setIsDraft] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

	const handleOpenForm = () => {
		setTitle(lastCommitMsg);
		setBody("");
		setBaseBranch("");
		setIsDraft(false);
		setShowForm(true);
		setResult(null);
	};

	const handleSubmit = async () => {
		if (!title.trim()) return;
		setSubmitting(true);
		const res = await onCreatePr(title.trim(), body || undefined, baseBranch || undefined, isDraft);
		setSubmitting(false);
		if (res.success && res.url) {
			setResult({ type: "ok", msg: `PR created: ${res.url}` });
			setShowForm(false);
		} else {
			setResult({ type: "err", msg: res.error ?? "Failed to create PR" });
		}
	};

	return (
		<div>
			{result && (
				<div
					className={`mb-2 rounded-lg px-3 py-1.5 text-xs ${
						result.type === "ok"
							? "bg-green-500/10 text-green-600 dark:text-green-400"
							: "bg-destructive/10 text-destructive"
					}`}
				>
					{result.type === "ok" && result.msg.includes("http") ? (
						<a href={result.msg.replace("PR created: ", "")} target="_blank" rel="noopener noreferrer" className="underline">
							{result.msg}
						</a>
					) : result.msg}
				</div>
			)}

			{prList.length > 0 ? (
				<div className="space-y-1 mb-3">
					{prList.map((pr) => (
						<button
							key={pr.number}
							type="button"
							onClick={() => window.open(pr.url, "_blank")}
							className="w-full text-left flex items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent/30 transition-colors"
						>
							<span className="shrink-0 font-mono text-primary">#{pr.number}</span>
							<span className="flex-1 truncate">{pr.title}</span>
							<span className="shrink-0 text-muted-foreground">{pr.author}</span>
						</button>
					))}
				</div>
			) : (
				!showForm && (
					<p className="py-4 text-center text-xs text-muted-foreground">
						No open PRs
					</p>
				)
			)}

			{showForm ? (
				<div className="space-y-2">
					<Input
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="PR title"
						className="rounded-lg text-xs"
						disabled={submitting}
					/>
					<textarea
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Description (optional)"
						className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
						disabled={submitting}
					/>
					<Input
						value={baseBranch}
						onChange={(e) => setBaseBranch(e.target.value)}
						placeholder="Base branch (optional)"
						className="rounded-lg text-xs"
						disabled={submitting}
					/>
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
							<input
								type="checkbox"
								checked={isDraft}
								onChange={(e) => setIsDraft(e.target.checked)}
								className="rounded"
								disabled={submitting}
							/>
							Draft
						</label>
						<div className="flex-1" />
						<Button
							type="button"
							variant="outline"
							onClick={() => setShowForm(false)}
							disabled={submitting}
							className="rounded-lg px-3 text-xs"
							size="sm"
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={handleSubmit}
							disabled={!title.trim() || submitting}
							className="rounded-lg px-3 text-xs"
							size="sm"
						>
							{submitting ? "Creating..." : "Create PR"}
						</Button>
					</div>
				</div>
			) : (
				<Button
					type="button"
					onClick={handleOpenForm}
					disabled={loading}
					className="w-full rounded-lg text-xs"
					size="sm"
				>
					Create PR
				</Button>
			)}
		</div>
	);
}

export function GitPanel({
	status,
	diff,
	log,
	stashList,
	prList,
	loading,
	onStageAll,
	onCommit,
	onPush,
	onFetch,
	onRefresh,
	onStashPush,
	onStashPop,
	onStashDrop,
	onPrCreate,
	onGenerateCommitMessage,
	gitUser,
	gitToken,
}: {
	status: GitStatusRPC | null;
	diff: string;
	log: GitLogEntry[];
	stashList: GitStashEntry[];
	prList: GhPrEntry[];
	loading: boolean;
	onStageAll: () => void;
	onCommit: (msg: string) => void;
	onPush: () => void;
	onFetch: () => void;
	onRefresh: () => void;
	onStashPush: (message?: string) => void;
	onStashPop: (index?: number) => void;
	onStashDrop: (index: number) => void;
	onPrCreate: (title: string, body?: string, base?: string, draft?: boolean) => Promise<{ success: boolean; url?: string; error?: string }>;
	onGenerateCommitMessage: () => Promise<{ message?: string; error?: string }>;
	gitUser?: string;
	gitToken?: string;
}) {
	const [commitMsg, setCommitMsg] = useState("");
	const [tab, setTab] = useState<"changes" | "log" | "stash" | "prs">("changes");
	const [feedback, setFeedback] = useState<{
		type: "ok" | "err";
		msg: string;
	} | null>(null);
	const [generatingMsg, setGeneratingMsg] = useState(false);

	if (!status) {
		return (
			<div className="flex h-full items-center justify-center p-6">
				<div className="text-center">
					<p className="text-sm text-muted-foreground">
						Not a git repository
					</p>
					<p className="mt-1 text-xs text-muted-foreground/60">
						Set a project directory with a git repo to see changes.
					</p>
				</div>
			</div>
		);
	}

	const handleCommit = () => {
		if (!commitMsg.trim()) return;
		onCommit(commitMsg.trim());
		setCommitMsg("");
	};

	const handleGenerateMsg = async () => {
		setGeneratingMsg(true);
		const result = await onGenerateCommitMessage();
		setGeneratingMsg(false);
		if (result.message) {
			setCommitMsg(result.message);
		} else if (result.error) {
			setFeedback({ type: "err", msg: result.error });
			setTimeout(() => setFeedback(null), 3000);
		}
	};

	const hasChanges =
		status.staged > 0 ||
		status.unstaged > 0 ||
		status.untracked > 0;

	const lastCommitMsg = log.length > 0 ? log[0].message : "";

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
				<div className="flex items-center gap-3">
					<BranchBadge
						branch={status.branch}
						ahead={status.ahead}
						behind={status.behind}
					/>
					<DiffBadge status={status} />
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onFetch}
						disabled={loading}
						className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
						title="Fetch"
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
						>
							<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
							<path d="M21 3v5h-5" />
						</svg>
					</button>
					<button
						type="button"
						onClick={onRefresh}
						disabled={loading}
						className="rounded-lg p-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
						title="Refresh"
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
						>
							<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
							<path d="M21 3v5h-5" />
							<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
							<path d="M3 21v-5h5" />
						</svg>
					</button>
				</div>
			</div>

			{/* Tab bar */}
			<div className="flex border-b border-border/60">
				<button
					type="button"
					onClick={() => setTab("changes")}
					className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
						tab === "changes"
							? "border-b-2 border-primary text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Changes
					{hasChanges && (
						<span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px]">
							{status.staged + status.unstaged + status.untracked}
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => setTab("log")}
					className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
						tab === "log"
							? "border-b-2 border-primary text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Log
				</button>
				<button
					type="button"
					onClick={() => setTab("stash")}
					className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
						tab === "stash"
							? "border-b-2 border-primary text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					Stash
					{stashList.length > 0 && (
						<span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px]">
							{stashList.length}
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => setTab("prs")}
					className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
						tab === "prs"
							? "border-b-2 border-primary text-foreground"
							: "text-muted-foreground hover:text-foreground"
					}`}
				>
					PRs
					{prList.length > 0 && (
						<span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px]">
							{prList.length}
						</span>
					)}
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-3">
				{tab === "changes" ? (
					<>
						{status.untrackedFiles.length > 0 && (
							<div className="mb-3">
								<p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
									Untracked ({status.untracked})
								</p>
								{status.untrackedFiles.map((f) => (
									<div
										key={f}
										className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent/30"
									>
										<span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
										<span className="truncate">{f}</span>
									</div>
								))}
							</div>
						)}
						{status.stagedFiles.length > 0 && (
							<div className="mb-3">
								<p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-green-500 dark:text-green-400">
									Staged ({status.staged})
								</p>
								{status.stagedFiles.map((f) => (
									<div
										key={f}
										className="flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent/30"
									>
										<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
										<span className="truncate">{f}</span>
									</div>
								))}
							</div>
						)}
						{(status.unstaged > 0 ||
							(status.untracked > 0)) && (
							<button
								type="button"
								onClick={onStageAll}
								className="mb-3 w-full rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
							>
								Stage All Changes
							</button>
						)}
						<DiffView diff={diff} />
					</>
				) : tab === "log" ? (
					<LogView log={log} />
				) : tab === "stash" ? (
					<StashView
						stashList={stashList}
						onPop={onStashPop}
						onDrop={onStashDrop}
						onStash={onStashPush}
						loading={loading}
					/>
				) : (
					<PrView
						prList={prList}
						onCreatePr={onPrCreate}
						lastCommitMsg={lastCommitMsg}
						loading={loading}
					/>
				)}
			</div>

			{/* Feedback toast */}
			{feedback && (
				<div
					className={`mx-3 mt-1 rounded-lg px-3 py-1.5 text-xs ${
						feedback.type === "ok"
							? "bg-green-500/10 text-green-600 dark:text-green-400"
							: "bg-destructive/10 text-destructive"
					}`}
				>
					{feedback.msg}
				</div>
			)}

			{/* Commit + Push bar */}
			<div className="border-t border-border/60 p-3">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleCommit();
					}}
					className="flex items-center gap-2"
				>
					<Input
						value={commitMsg}
						onChange={(e) => setCommitMsg(e.target.value)}
						placeholder="Commit message..."
						className="flex-1 rounded-lg text-xs"
						disabled={loading}
					/>
					<button
						type="button"
						onClick={handleGenerateMsg}
						disabled={generatingMsg || loading}
						className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
						title="Generate commit message with AI"
					>
						{generatingMsg ? (
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
								className="animate-spin"
							>
								<path d="M21 12a9 9 0 1 1-6.219-8.56" />
							</svg>
						) : (
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
							>
								<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
							</svg>
						)}
					</button>
					<Button
						type="submit"
						disabled={!commitMsg.trim() || status.staged === 0 || loading}
						className="rounded-lg px-3 text-xs"
						size="sm"
					>
						Commit
					</Button>
				</form>
				<div className="mt-2 flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							onPush();
							setFeedback({ type: "ok", msg: "Pushed!" });
							setTimeout(() => setFeedback(null), 2000);
						}}
						disabled={status.ahead === 0 || loading}
						className="flex-1 rounded-lg text-xs"
						size="sm"
					>
						Push ({status.ahead})
					</Button>
				</div>
			</div>
		</div>
	);
}

export { DiffBadge };
