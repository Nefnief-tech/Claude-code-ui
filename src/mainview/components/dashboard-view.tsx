import type { Project } from "@/lib/use-projects";
import { cn } from "@/lib/utils";

function relativeTime(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

export function DashboardView({
	projects,
	activeProjectId,
	onSwitchProject,
	onDeleteProject,
	onAddProject,
	onOpenChat,
}: {
	projects: Project[];
	activeProjectId: string | null;
	onSwitchProject: (id: string) => void;
	onDeleteProject: (id: string) => void;
	onAddProject: () => void;
	onOpenChat: (projectId: string) => void;
}) {
	const sortedProjects = [...projects].sort((a, b) => {
		const aLast = a.sessions.reduce<number>(
			(max: number, s) => Math.max(max, s.createdAt),
			a.createdAt,
		);
		const bLast = b.sessions.reduce<number>(
			(max: number, s) => Math.max(max, s.createdAt),
			b.createdAt,
		);
		return bLast - aLast;
	});

	return (
		<div className="flex-1 overflow-y-auto p-6">
			<div className="mx-auto max-w-5xl">
				{/* Header */}
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Dashboard
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Your projects
						</p>
					</div>
					<button
						type="button"
						onClick={onAddProject}
						className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
						New
					</button>
				</div>

				{/* Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{sortedProjects.map((project) => {
						const isActive = project.id === activeProjectId;
						const sessionCount = project.sessions.length;
						const lastActivity = project.sessions.reduce<number>(
							(max: number, s) => Math.max(max, s.createdAt),
							project.createdAt,
						);

						return (
							<div
								key={project.id}
								onClick={() => onOpenChat(project.id)}
								className={cn(
									"group relative rounded-xl border bg-card/50 p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
									isActive
										? "ring-2 ring-primary border-primary/40"
										: "border-border/60",
								)}
							>
								{/* Delete button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onDeleteProject(project.id);
									}}
									className="absolute right-3 top-3 rounded-md p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
									title="Delete project"
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
										<path d="M18 6 6 18M6 6l12 12" />
									</svg>
								</button>

								{/* Project name */}
								<h3 className="text-[15px] font-semibold truncate pr-6">
									{project.name}
								</h3>

								{/* Path */}
								{project.path && (
									<p
										className="mt-1 text-xs text-muted-foreground truncate"
										title={project.path}
									>
										{project.path}
									</p>
								)}

								{/* Stats */}
								<div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
									<span className="inline-flex items-center gap-1 rounded-full bg-accent/60 px-2 py-0.5">
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
											<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
										</svg>
										{sessionCount} session{sessionCount !== 1 && "s"}
									</span>
									<span>Last: {relativeTime(lastActivity)}</span>
								</div>

								{/* Open button */}
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onSwitchProject(project.id);
									}}
									className="mt-3 rounded-lg border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								>
									Open
								</button>
							</div>
						);
					})}

					{/* New Project card */}
					<button
						type="button"
						onClick={onAddProject}
						className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-card/20 p-5 min-h-[140px] text-muted-foreground hover:border-primary/40 hover:text-primary/70 hover:bg-card/40 transition-all"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
						<span className="mt-2 text-sm font-medium">New Project</span>
					</button>
				</div>
			</div>
		</div>
	);
}
