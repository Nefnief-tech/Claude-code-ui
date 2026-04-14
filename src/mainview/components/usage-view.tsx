import { useEffect, useMemo, useState } from "react";
import type { ChatMessage } from "@/lib/use-agent-chat";
import type { Project } from "@/lib/use-projects";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
	if (ms <= 0) return "00:00:00";
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(ts: number): string {
	return new Date(ts).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function formatTime(ts: number): string {
	return new Date(ts).toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

type DayData = { date: string; count: number };

export function UsageView({
	projects,
	zaiPlanEnabled,
	planTimerStart,
	sessionCost,
	estimatedTokens,
	messageCount,
	onTogglePlan,
	onClose,
}: {
	projects: Project[];
	zaiPlanEnabled: boolean;
	planTimerStart: number | null;
	sessionCost: number;
	estimatedTokens: number;
	messageCount: number;
	onTogglePlan: (enabled: boolean) => void;
	onClose: () => void;
}) {
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		if (!zaiPlanEnabled || !planTimerStart) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [zaiPlanEnabled, planTimerStart]);

	const remaining = planTimerStart
		? Math.max(0, FIVE_HOURS_MS - (now - planTimerStart))
		: FIVE_HOURS_MS;
	const progress = planTimerStart
		? Math.max(0, Math.min(1, (now - planTimerStart) / FIVE_HOURS_MS))
		: 0;
	const expired = planTimerStart ? remaining <= 0 : false;

	// Aggregate all sessions across all projects
	const allSessions = useMemo(() => {
		const sessions: {
			id: string;
			title: string;
			projectName: string;
			createdAt: number;
			messageCount: number;
			pinned?: boolean;
		}[] = [];
		for (const project of projects) {
			for (const session of project.sessions) {
				sessions.push({
					id: session.id,
					title: session.title,
					projectName: project.name,
					createdAt: session.createdAt,
					messageCount: session.messages.filter(
						(m: ChatMessage) => m.role === "user" || m.role === "assistant",
					).length,
					pinned: session.pinned,
				});
			}
		}
		return sessions.sort((a, b) => {
			const pa = a.pinned ? 1 : 0;
			const pb = b.pinned ? 1 : 0;
			if (pb !== pa) return pb - pa;
			return b.createdAt - a.createdAt;
		});
	}, [projects]);

	// Activity graph data: last 12 weeks
	const { grid, maxCount } = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Go back 11 weeks + find the start of that week (Sunday)
		const startOfRange = new Date(today);
		startOfRange.setDate(startOfRange.getDate() - 11 * 7);
		// Go to the Sunday of that week
		startOfRange.setDate(startOfRange.getDate() - startOfRange.getDay());

		// Build date → count map
		const dayMap = new Map<string, number>();
		for (const session of allSessions) {
			const d = new Date(session.createdAt);
			d.setHours(0, 0, 0, 0);
			const key = d.toISOString().slice(0, 10);
			dayMap.set(key, (dayMap.get(key) || 0) + session.messageCount);
		}

		// Build 7 rows × N columns grid
		const numWeeks = 12;
		const cols: DayData[][] = [];
		let mc = 0;

		for (let w = 0; w < numWeeks; w++) {
			const week: DayData[] = [];
			for (let d = 0; d < 7; d++) {
				const date = new Date(startOfRange);
				date.setDate(date.getDate() + w * 7 + d);
				const key = date.toISOString().slice(0, 10);
				const count = dayMap.get(key) || 0;
				mc = Math.max(mc, count);
				week.push({ date: key, count });
			}
			cols.push(week);
		}

		return { grid: cols, maxCount: mc || 1 };
	}, [allSessions]);

	const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

	// Tooltip state
	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		date: string;
		count: number;
	} | null>(null);

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold tracking-tight">Usage</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Track your session activity and z.ai plan status
					</p>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-6">
				<div className="mx-auto max-w-3xl space-y-6">
					{/* z.ai Plan card */}
					<div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<h3 className="text-sm font-semibold">z.ai Coding Plan</h3>
								<p className="text-[11px] text-muted-foreground">
									5-hour usage window
								</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={zaiPlanEnabled}
								onClick={() => onTogglePlan(!zaiPlanEnabled)}
								className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-border/60 transition-colors cursor-pointer ${
									zaiPlanEnabled
										? "bg-primary border-primary"
										: "bg-secondary/60"
								}`}
							>
								<span
									className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-sm transition-transform ${
										zaiPlanEnabled ? "translate-x-5" : "translate-x-0"
									}`}
								/>
							</button>
						</div>

						{zaiPlanEnabled && (
							<div className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-3">
								{planTimerStart && !expired ? (
									<>
										<div className="text-center">
											<p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
												Resets in
											</p>
											<p className="text-3xl font-mono font-bold tracking-tight">
												{formatRemaining(remaining)}
											</p>
										</div>
										<div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
											<div
												className="h-full rounded-full bg-primary transition-all duration-1000"
												style={{ width: `${progress * 100}%` }}
											/>
										</div>
									</>
								) : expired ? (
									<div className="text-center space-y-1">
										<p className="text-sm font-medium text-primary">
											Plan period expired
										</p>
										<p className="text-[11px] text-muted-foreground">
											Send a message to start a new 5-hour window
										</p>
									</div>
								) : (
									<div className="text-center space-y-1">
										<p className="text-sm text-muted-foreground">
											Starts on first message
										</p>
										<p className="text-[11px] text-muted-foreground/60">
											5-hour countdown begins when you send
										</p>
									</div>
								)}
							</div>
						)}
					</div>

					{/* Current Session stats */}
					<div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
						<h3 className="text-sm font-semibold">Current Session</h3>
						<div className="grid grid-cols-2 gap-3">
							<StatCard
								label="Cost"
								value={
									sessionCost > 0
										? `$${sessionCost.toFixed(4)}`
										: "$0.00"
								}
							/>
							<StatCard
								label="Tokens"
								value={
									estimatedTokens > 0
										? estimatedTokens >= 1000
											? `~${(estimatedTokens / 1000).toFixed(1)}k`
											: `~${Math.round(estimatedTokens)}`
										: "0"
								}
							/>
							<StatCard
								label="Messages"
								value={String(messageCount)}
							/>
							<StatCard label="Model" value="Claude" />
						</div>
					</div>

					{/* Activity Graph */}
					<div className="rounded-xl border border-border/60 bg-card/50 p-5 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-semibold">Activity</h3>
							<span className="text-[11px] text-muted-foreground">
								Last 12 weeks
							</span>
						</div>
						<div className="overflow-x-auto">
							<div className="flex gap-[3px] items-start min-w-fit">
								{/* Day labels */}
								<div className="flex flex-col gap-[3px] shrink-0">
									{dayLabels.map((label, i) => (
										<div
											key={label}
											className="h-[13px] flex items-center text-[9px] text-muted-foreground/50 w-6"
										>
											{i % 2 === 1 ? label : ""}
										</div>
									))}
								</div>
								{/* Grid cells */}
								{grid.map((week, wi) => (
									<div key={wi} className="flex flex-col gap-[3px]">
										{week.map((day, di) => {
											const intensity =
												day.count === 0
													? 0
													: day.count / maxCount;
											return (
												<div
													key={di}
													className="h-[13px] w-[13px] rounded-[2px] cursor-pointer transition-colors"
													style={{
														backgroundColor:
															day.count === 0
																? "oklch(0.25 0.02 260)"
																: `oklch(${
																		0.3 +
																		intensity * 0.5
																	} ${0.08 + intensity * 0.15} 260)`,
													}}
													onMouseEnter={(e) => {
														const rect =
															e.currentTarget.getBoundingClientRect();
														setTooltip({
															x: rect.left + rect.width / 2,
															y: rect.top - 4,
															date: day.date,
															count: day.count,
														});
													}}
													onMouseLeave={() => setTooltip(null)}
												/>
											);
										})}
									</div>
								))}
							</div>
							{/* Legend */}
							<div className="flex items-center gap-1.5 mt-2 justify-end">
								<span className="text-[9px] text-muted-foreground/50">Less</span>
								{[0, 0.25, 0.5, 0.75, 1].map((v) => (
									<div
										key={v}
										className="h-[10px] w-[10px] rounded-[2px]"
										style={{
											backgroundColor:
												v === 0
													? "oklch(0.25 0.02 260)"
													: `oklch(${0.3 + v * 0.5} ${0.08 + v * 0.15} 260)`,
										}}
									/>
								))}
								<span className="text-[9px] text-muted-foreground/50">More</span>
							</div>
						</div>
						{tooltip && (
							<div
								className="fixed z-50 rounded-md border border-border/60 bg-card px-2.5 py-1.5 text-[11px] shadow-md pointer-events-none"
								style={{
									left: tooltip.x,
									top: tooltip.y,
									transform: "translate(-50%, -100%)",
								}}
							>
								<div className="font-medium">
									{tooltip.count} message{tooltip.count !== 1 ? "s" : ""}
								</div>
								<div className="text-muted-foreground">
									{new Date(tooltip.date + "T00:00:00").toLocaleDateString(
										undefined,
										{ weekday: "short", month: "short", day: "numeric" },
									)}
								</div>
							</div>
						)}
					</div>

					{/* All Sessions list */}
					<div className="rounded-xl border border-border/60 bg-card/50 overflow-hidden">
						<div className="px-5 py-4 border-b border-border/40">
							<h3 className="text-sm font-semibold">
								All Sessions ({allSessions.length})
							</h3>
						</div>
						{allSessions.length === 0 ? (
							<div className="px-5 py-8 text-center text-sm text-muted-foreground">
								No sessions yet
							</div>
						) : (
							<div className="divide-y divide-border/30">
								{allSessions.map((session) => (
									<div
										key={session.id}
										className="flex items-center gap-4 px-5 py-3 hover:bg-accent/30 transition-colors"
									>
										{session.pinned && (
											<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="shrink-0 text-primary/50">
												<path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76Z" />
											</svg>
										)}
										<div className="flex-1 min-w-0">
											<div className="text-sm truncate">
												{session.title || "Untitled"}
											</div>
											<div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
												<span>{session.projectName}</span>
												<span className="text-border">·</span>
												<span>
													{formatDate(session.createdAt)}{" "}
													{formatTime(session.createdAt)}
												</span>
											</div>
										</div>
										<div className="shrink-0 text-right">
											<div className="text-xs font-mono">
												{session.messageCount} msg
												{session.messageCount !== 1 ? "s" : ""}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function StatCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-lg border border-border/40 bg-secondary/20 px-4 py-3 space-y-1">
			<p className="text-[10px] uppercase tracking-wider text-muted-foreground">
				{label}
			</p>
			<p className="text-lg font-mono font-semibold">{value}</p>
		</div>
	);
}
