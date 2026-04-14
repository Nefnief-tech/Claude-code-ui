import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SkillInfo, SkillSearchResult } from "@/lib/use-skills";
import type { SkillSource } from "shared/rpc";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const sourceColors: Record<SkillSource, string> = {
	user: "bg-secondary/60 text-secondary-foreground",
	agent: "bg-primary/10 text-primary",
	plugin: "bg-accent/60 text-accent-foreground",
};

function SourceBadge({ source }: { source: SkillSource }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize",
				sourceColors[source],
			)}
		>
			{source}
		</span>
	);
}

function SkillCard({
	skill,
	selected,
	onClick,
	onRemove,
}: {
	skill: SkillInfo;
	selected: boolean;
	onClick: () => void;
	onRemove: () => void;
}) {
	return (
		<div
			onClick={onClick}
			className={cn(
				"group cursor-pointer rounded-lg border px-3 py-2.5 transition-all",
				selected
					? "border-primary/40 bg-primary/5"
					: "border-border/60 hover:border-border hover:bg-accent/30",
			)}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium truncate">{skill.name}</span>
						<SourceBadge source={skill.source} />
					</div>
					<p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
						{skill.description}
					</p>
				</div>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
					className="shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
					title="Remove skill"
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
					>
						<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
					</svg>
				</button>
			</div>
		</div>
	);
}

function SearchResultCard({
	result,
	onInstall,
	disabled,
}: {
	result: SkillSearchResult;
	onInstall: () => void;
	disabled: boolean;
}) {
	return (
		<div className="rounded-lg border border-border/60 px-3 py-2.5">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium truncate">{result.name}</span>
						{result.author && (
							<span className="text-[10px] text-muted-foreground">
								by {result.author}
							</span>
						)}
					</div>
					<p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
						{result.description}
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={onInstall}
					disabled={disabled}
					className="shrink-0 rounded-lg text-xs"
				>
					Install
				</Button>
			</div>
		</div>
	);
}

export function SkillsView({
	skills,
	loading,
	selectedSkill,
	skillContent,
	searchResults,
	searching,
	searchError,
	feedback,
	onRefresh,
	onSelectSkill,
	onSearch,
	onInstall,
	onRemove,
	onClearFeedback,
	onClose,
}: {
	skills: SkillInfo[];
	loading: boolean;
	selectedSkill: SkillInfo | null;
	skillContent: string;
	searchResults: SkillSearchResult[];
	searching: boolean;
	searchError?: string;
	feedback: { type: "ok" | "err"; msg: string } | null;
	onRefresh: () => void;
	onSelectSkill: (skill: SkillInfo) => void;
	onSearch: (query: string) => void;
	onInstall: (pkg: string) => void;
	onRemove: (skill: SkillInfo) => void;
	onClearFeedback: () => void;
	onClose: () => void;
}) {
	const [tab, setTab] = useState<"installed" | "browse">("installed");
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		onRefresh();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
						title="Back to chat"
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
							<path d="m15 18-6-6 6-6" />
						</svg>
					</button>
					<div>
						<h2 className="text-lg font-semibold tracking-tight">Skills</h2>
						<p className="text-xs text-muted-foreground">
							Browse and manage installed skills
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onRefresh}
					disabled={loading}
					className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40"
					title="Refresh"
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
						<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
						<path d="M21 3v5h-5" />
						<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
						<path d="M3 21v-5h5" />
					</svg>
				</button>
			</div>

			{/* Tab bar */}
			<div className="flex border-b border-border/60">
				<button
					type="button"
					onClick={() => setTab("installed")}
					className={cn(
						"flex-1 px-3 py-2 text-xs font-medium transition-colors",
						tab === "installed"
							? "border-b-2 border-primary text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					Installed
					{skills.length > 0 && (
						<span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/20 px-1 text-[10px]">
							{skills.length}
						</span>
					)}
				</button>
				<button
					type="button"
					onClick={() => setTab("browse")}
					className={cn(
						"flex-1 px-3 py-2 text-xs font-medium transition-colors",
						tab === "browse"
							? "border-b-2 border-primary text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					Browse
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 min-h-0 flex">
				{tab === "installed" ? (
					<>
						{/* Skill list */}
						<div className="w-72 shrink-0 border-r border-border/60 overflow-y-auto p-3 space-y-2">
							{loading && skills.length === 0 ? (
								<div className="space-y-2">
									{[0, 1, 2, 3].map((i) => (
										<div key={i} className="rounded-lg border border-border/60 px-3 py-2.5">
											<div className="flex items-center gap-2 mb-1.5">
												<div className="h-4 w-24 animate-pulse rounded-md bg-secondary/40" />
												<div className="h-4 w-12 animate-pulse rounded-full bg-secondary/40" />
											</div>
											<div className="h-3 w-full animate-pulse rounded-md bg-secondary/30" />
										</div>
									))}
								</div>
							) : skills.length === 0 ? (
								<div className="py-8 text-center">
									<p className="text-sm text-muted-foreground">
										No skills installed
									</p>
									<p className="mt-1 text-xs text-muted-foreground/60">
										Switch to Browse to find skills
									</p>
								</div>
							) : (
								skills.map((skill) => (
									<SkillCard
										key={skill.directory}
										skill={skill}
										selected={selectedSkill?.directory === skill.directory}
										onClick={() => onSelectSkill(skill)}
										onRemove={() => onRemove(skill)}
									/>
								))
							)}
						</div>

						{/* Detail panel */}
						<div className="flex-1 min-w-0 overflow-y-auto p-4">
							{selectedSkill ? (
								<div>
									<div className="flex items-center gap-2 mb-3">
										<h3 className="text-base font-semibold">
											{selectedSkill.name}
										</h3>
										<SourceBadge source={selectedSkill.source} />
									</div>
									{selectedSkill.hasReferences ||
									selectedSkill.hasScripts ||
									selectedSkill.hasData ? (
										<div className="flex gap-1.5 mb-3">
											{selectedSkill.hasReferences && (
												<span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px]">
													references
												</span>
											)}
											{selectedSkill.hasScripts && (
												<span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px]">
													scripts
												</span>
											)}
											{selectedSkill.hasData && (
												<span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px]">
													data
												</span>
											)}
										</div>
									) : null}
									{skillContent ? (
										<pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background/50 p-4 text-xs font-mono leading-relaxed">
											{skillContent}
										</pre>
									) : (
										<div className="flex items-center justify-center py-8">
											<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
										</div>
									)}
								</div>
							) : (
								<div className="flex h-full items-center justify-center">
									<p className="text-sm text-muted-foreground">
										Select a skill to view details
									</p>
								</div>
							)}
						</div>
					</>
				) : (
					/* Browse tab */
					<div className="flex-1 overflow-y-auto p-4">
						<form
							onSubmit={(e) => {
								e.preventDefault();
								if (searchQuery.trim()) onSearch(searchQuery.trim());
							}}
							className="flex items-center gap-2 mb-4"
						>
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Search skills..."
								className="flex-1 rounded-lg text-sm"
							/>
							<Button
								type="submit"
								disabled={searching || !searchQuery.trim()}
								className="rounded-lg text-xs"
								size="sm"
							>
								Search
							</Button>
						</form>

						{searching && (
							<div className="flex items-center justify-center py-8">
								<div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
							</div>
						)}

						{searchError && (
							<div className="mb-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
								{searchError}
							</div>
						)}

						{!searching && searchResults.length > 0 && (
							<div className="space-y-2">
								{searchResults.map((result) => (
									<SearchResultCard
										key={result.package}
										result={result}
										onInstall={() => onInstall(result.package)}
										disabled={searching}
									/>
								))}
							</div>
						)}

						{!searching && searchResults.length === 0 && !searchError && (
							<div className="py-8 text-center">
								<p className="text-sm text-muted-foreground">
									Search for skills to install
								</p>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Feedback toast */}
			{feedback && (
				<div
					className={cn(
						"border-t px-6 py-2 text-xs",
						feedback.type === "ok"
							? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
							: "bg-destructive/10 text-destructive border-destructive/20",
					)}
				>
					<div className="flex items-center justify-between">
						<span>{feedback.msg}</span>
						<button
							type="button"
							onClick={onClearFeedback}
							className="rounded-md p-1 hover:bg-accent/40 transition-colors"
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
							>
								<path d="M18 6 6 18M6 6l12 12" />
							</svg>
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
