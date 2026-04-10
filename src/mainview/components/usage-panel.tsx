import { useEffect, useState } from "react";

const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;

function formatRemaining(ms: number): string {
	if (ms <= 0) return "00:00:00";
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function UsagePanel({
	zaiPlanEnabled,
	planTimerStart,
	sessionCost,
	estimatedTokens,
	messageCount,
	onTogglePlan,
	onClose,
}: {
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

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
				<h2 className="text-sm font-semibold">Usage</h2>
				<button
					type="button"
					onClick={onClose}
					className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
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
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-5">
				{/* Plan toggle */}
				<div className="space-y-2">
					<label className="flex items-center justify-between cursor-pointer">
						<div className="space-y-0.5">
							<span className="text-sm font-medium">z.ai Coding Plan</span>
							<p className="text-[11px] text-muted-foreground">
								5-hour usage window
							</p>
						</div>
						<button
							type="button"
							role="switch"
							aria-checked={zaiPlanEnabled}
							onClick={() => onTogglePlan(!zaiPlanEnabled)}
							className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border border-border/60 transition-colors ${
								zaiPlanEnabled
									? "bg-primary border-primary"
									: "bg-secondary/60"
							}`}
						>
							<span
								className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
									zaiPlanEnabled ? "translate-x-4" : "translate-x-0"
								}`}
							/>
						</button>
					</label>
				</div>

				{/* Timer section */}
				{zaiPlanEnabled && (
					<div className="rounded-lg border border-border/60 bg-secondary/30 p-4 space-y-3">
						{planTimerStart && !expired ? (
							<>
								<div className="text-center">
									<p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
										Resets in
									</p>
									<p className="text-2xl font-mono font-bold tracking-tight">
										{formatRemaining(remaining)}
									</p>
								</div>
								<div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
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

				{/* Session stats */}
				<div className="space-y-2">
					<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
						Session Stats
					</h3>
					<div className="space-y-1.5">
						<StatRow
							label="Cost"
							value={
								sessionCost > 0
									? `$${sessionCost.toFixed(4)}`
									: "$0.00"
							}
						/>
						<StatRow
							label="Tokens"
							value={
								estimatedTokens > 0
									? estimatedTokens >= 1000
										? `~${(estimatedTokens / 1000).toFixed(1)}k`
										: `~${Math.round(estimatedTokens)}`
									: "0"
							}
						/>
						<StatRow label="Messages" value={String(messageCount)} />
					</div>
				</div>
			</div>
		</div>
	);
}

function StatRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between rounded-md px-3 py-2 bg-secondary/30">
			<span className="text-xs text-muted-foreground">{label}</span>
			<span className="text-xs font-mono font-medium">{value}</span>
		</div>
	);
}
