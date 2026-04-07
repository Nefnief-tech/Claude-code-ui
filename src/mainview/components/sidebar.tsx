import { useState } from "react";
import type { Project, Session } from "@/lib/use-projects";
import { cn } from "@/lib/utils";

export function Sidebar({
	projects,
	activeProjectId,
	activeSessionId,
	activeView,
	sessions,
	gitDiffSummary,
	collapsed,
	onToggleCollapse,
	onSwitchProject,
	onDeleteProject,
	onRenameProject,
	onAddProject,
	onSwitchSession,
	onNewSession,
	onDeleteSession,
	onOpenDashboard,
	onOpenSettings,
	onOpenSkills,
	onToggleTheme,
	resolvedTheme,
}: {
	projects: Project[];
	activeProjectId: string | null;
	activeSessionId: string | null;
	activeView: "chat" | "dashboard" | "settings" | "skills";
	sessions: Session[];
	gitDiffSummary?: { insertions: number; deletions: number } | null;
	collapsed: boolean;
	onToggleCollapse: () => void;
	onSwitchProject: (id: string) => void;
	onDeleteProject: (id: string) => void;
	onRenameProject: (id: string, name: string) => void;
	onAddProject: () => void;
	onSwitchSession: (id: string) => void;
	onNewSession: () => void;
	onDeleteSession: (id: string) => void;
	onOpenDashboard: () => void;
	onOpenSettings: () => void;
	onOpenSkills: () => void;
	onToggleTheme: () => void;
	resolvedTheme: "light" | "dark";
}) {
	return (
		<aside
			className={cn(
				"flex h-full flex-col border border-border/60 bg-card/50 backdrop-blur-sm rounded-xl overflow-hidden transition-[width] duration-200",
				collapsed ? "w-[52px]" : "w-72",
			)}
		>
			{/* Header */}
			<div className={cn("flex items-center px-3 py-3.5", collapsed ? "justify-center" : "justify-between")}>
				{collapsed ? (
					<button
						type="button"
						onClick={onNewSession}
						className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
						title="New Chat"
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
							<path d="M12 5v14M5 12h14" />
						</svg>
					</button>
				) : (
					<>
						<span className="text-[15px] font-semibold tracking-tight">
							cc-uui
						</span>
						<div className="flex items-center gap-1">
							<button
								type="button"
								onClick={onNewSession}
								className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								title="New Chat"
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
									<path d="M12 5v14M5 12h14" />
								</svg>
							</button>
							<button
								type="button"
								onClick={onAddProject}
								className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								title="New Project"
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
									<path d="M12 10v6M9 13h6" />
									<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
								</svg>
							</button>
						</div>
					</>
				)}
			</div>

			{/* Separator */}
			{!collapsed && <div className="mx-3 h-px bg-border/60" />}

			{/* Project list */}
			{!collapsed && (
				<div className="flex-1 overflow-y-auto py-2 px-2">
					{projects.map((project) => (
						<ProjectRow
							key={project.id}
							project={project}
							isActive={project.id === activeProjectId}
							activeSessionId={activeSessionId}
							activeView={activeView}
							gitDiffSummary={
								project.id === activeProjectId
									? gitDiffSummary
									: undefined
							}
							sessions={
								project.id === activeProjectId ? sessions : []
							}
							onSwitchProject={onSwitchProject}
							onDeleteProject={onDeleteProject}
							onRenameProject={onRenameProject}
							onSwitchSession={onSwitchSession}
							onDeleteSession={onDeleteSession}
						/>
					))}
				</div>
			)}

			{/* Bottom actions */}
			<div
				className={cn(
					"border-t border-border/60 p-2",
					collapsed ? "flex flex-col items-center gap-1" : "flex items-center gap-1",
				)}
			>
				<button
					type="button"
					onClick={onOpenDashboard}
					className={cn(
						"rounded-lg p-2 transition-colors",
						activeView === "dashboard"
							? "bg-accent text-accent-foreground"
							: "text-muted-foreground hover:bg-accent hover:text-foreground",
					)}
					title="Dashboard"
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
						<rect width="7" height="7" x="3" y="3" rx="1" />
						<rect width="7" height="7" x="14" y="3" rx="1" />
						<rect width="7" height="7" x="3" y="14" rx="1" />
						<rect width="7" height="7" x="14" y="14" rx="1" />
					</svg>
				</button>
				<button
					type="button"
					onClick={onOpenSettings}
					className={cn(
						"rounded-lg p-2 transition-colors",
						activeView === "settings"
							? "bg-accent text-accent-foreground"
							: "text-muted-foreground hover:bg-accent hover:text-foreground",
					)}
					title="Settings"
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
						<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
						<circle cx="12" cy="12" r="3" />
					</svg>
				</button>
				<button
					type="button"
					onClick={onOpenSkills}
					className={cn(
						"rounded-lg p-2 transition-colors",
						activeView === "skills"
							? "bg-accent text-accent-foreground"
							: "text-muted-foreground hover:bg-accent hover:text-foreground",
					)}
					title="Skills"
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
						<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
						<path d="M5 3v4" />
						<path d="M19 17v4" />
						<path d="M3 5h4" />
						<path d="M17 19h4" />
					</svg>
				</button>
				<button
					type="button"
					onClick={onToggleTheme}
					className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
					title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
				>
					{resolvedTheme === "dark" ? (
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
							<circle cx="12" cy="12" r="4" />
							<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
						</svg>
					) : (
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
							<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
						</svg>
					)}
				</button>
				<button
					type="button"
					onClick={onToggleCollapse}
					className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
					title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
						className={cn("transition-transform duration-200", collapsed && "rotate-180")}
					>
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>
			</div>
		</aside>
	);
}

function ProjectRow({
	project,
	isActive,
	activeSessionId,
	activeView,
	sessions,
	gitDiffSummary,
	onSwitchProject,
	onDeleteProject,
	onRenameProject,
	onSwitchSession,
	onDeleteSession,
}: {
	project: Project;
	isActive: boolean;
	activeSessionId: string | null;
	activeView: "chat" | "dashboard" | "settings" | "skills";
	sessions: Session[];
	gitDiffSummary?: { insertions: number; deletions: number } | null;
	onSwitchProject: (id: string) => void;
	onDeleteProject: (id: string) => void;
	onRenameProject: (id: string, name: string) => void;
	onSwitchSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
}) {
	const [renaming, setRenaming] = useState(false);
	const [renameValue, setRenameValue] = useState(project.name);

	const handleStartRename = (e: React.MouseEvent) => {
		e.stopPropagation();
		setRenameValue(project.name);
		setRenaming(true);
	};

	const commitRename = () => {
		const trimmed = renameValue.trim();
		if (trimmed && trimmed !== project.name) {
			onRenameProject(project.id, trimmed);
		}
		setRenaming(false);
	};

	const handleRenameKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			commitRename();
		} else if (e.key === "Escape") {
			setRenaming(false);
		}
	};

	return (
		<div className={cn("mb-0.5", isActive && "mb-1")}>
			{/* Project header row */}
			<div
				className={cn(
					"group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-[13px] transition-all",
					isActive
						? "bg-accent/70 text-foreground"
						: "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
				)}
				onClick={() => onSwitchProject(project.id)}
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
					className={cn(
						"shrink-0 transition-transform duration-200",
						isActive && "rotate-90",
					)}
				>
					<path d="m9 18 6-6-6-6" />
				</svg>

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
					className="shrink-0 opacity-50"
				>
					<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
				</svg>

				{renaming ? (
					<input
						type="text"
						value={renameValue}
						onChange={(e) => setRenameValue(e.target.value)}
						onBlur={commitRename}
						onKeyDown={handleRenameKeyDown}
						onClick={(e) => e.stopPropagation()}
						className="flex-1 min-w-0 rounded-md border border-input bg-background/80 px-2 py-0.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
						autoFocus
					/>
				) : (
					<>
						<span className="flex-1 truncate font-medium">
							{project.name}
						</span>
						{gitDiffSummary &&
							gitDiffSummary.insertions + gitDiffSummary.deletions > 0 && (
								<span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-mono opacity-60 group-hover:opacity-100">
									<span className="text-green-500">+{gitDiffSummary.insertions}</span>
									<span className="text-red-500">-{gitDiffSummary.deletions}</span>
								</span>
							)}
					</>
				)}

				{!renaming && (
					<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							type="button"
							onClick={handleStartRename}
							className="shrink-0 rounded-md p-1 hover:bg-background/60 transition-colors"
							title="Rename project"
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
								<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
							</svg>
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteProject(project.id);
							}}
							className="shrink-0 rounded-md p-1 hover:bg-destructive/10 hover:text-destructive transition-colors"
							title="Delete project"
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
				)}
			</div>

			{/* Sessions under active project */}
			{isActive &&
				sessions.map((session) => (
					<div
						key={session.id}
						className={cn(
							"group flex items-center gap-2 pl-9 pr-2 py-1.5 rounded-lg cursor-pointer text-[13px] transition-all",
							session.id === activeSessionId &&
								activeView === "chat"
								? "bg-primary/10 text-foreground font-medium"
								: "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
						)}
						onClick={() => onSwitchSession(session.id)}
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
							className="shrink-0 opacity-40"
						>
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
						</svg>
						<span className="flex-1 truncate">{session.title}</span>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onDeleteSession(session.id);
							}}
							className="shrink-0 rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
							title="Delete session"
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
				))}
		</div>
	);
}
