import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GitStatusRPC, GitLogEntry } from "@/lib/use-git";
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

export function GitPanel({
	status,
	diff,
	log,
	loading,
	onStageAll,
	onCommit,
	onPush,
	onFetch,
	onRefresh,
	gitUser,
	gitToken,
}: {
	status: GitStatusRPC | null;
	diff: string;
	log: GitLogEntry[];
	loading: boolean;
	onStageAll: () => void;
	onCommit: (msg: string) => void;
	onPush: () => void;
	onFetch: () => void;
	onRefresh: () => void;
	gitUser?: string;
	gitToken?: string;
}) {
	const [commitMsg, setCommitMsg] = useState("");
	const [tab, setTab] = useState<"changes" | "log">("changes");
	const [feedback, setFeedback] = useState<{
		type: "ok" | "err";
		msg: string;
	} | null>(null);

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

	const hasChanges =
		status.staged > 0 ||
		status.unstaged > 0 ||
		status.untracked > 0;

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
				) : (
					<LogView log={log} />
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
