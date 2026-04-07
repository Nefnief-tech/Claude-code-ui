import { Input } from "@/components/ui/input";
import type { Theme } from "@/lib/use-theme";

type MobileStatus = {
	running: boolean;
	port: number;
	url: string;
	clients: number;
	qrSvg: string;
};

export function SettingsView({
	apiKey,
	baseUri,
	theme,
	gitUser,
	gitToken,
	mobileEnabled,
	mobilePort,
	mobileStatus,
	onApiKeyChange,
	onBaseUriChange,
	onThemeChange,
	onGitUserChange,
	onGitTokenChange,
	onShowOnboarding,
	onMobileToggle,
	onMobilePortChange,
	onMobileRefresh,
}: {
	apiKey: string;
	baseUri: string;
	theme: Theme;
	gitUser: string;
	gitToken: string;
	mobileEnabled: boolean;
	mobilePort: number;
	mobileStatus: MobileStatus | null;
	onApiKeyChange: (v: string) => void;
	onBaseUriChange: (v: string) => void;
	onThemeChange: (t: Theme) => void;
	onGitUserChange: (v: string) => void;
	onGitTokenChange: (v: string) => void;
	onShowOnboarding: () => void;
	onMobileToggle: (enabled: boolean) => void;
	onMobilePortChange: (port: number) => void;
	onMobileRefresh: () => void;
}) {
	const themes: Theme[] = ["light", "dark", "system"];
	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-border/60 px-6 py-4">
				<h2 className="text-lg font-semibold tracking-tight">Settings</h2>
				<p className="mt-0.5 text-xs text-muted-foreground">
					Configure your API credentials and preferences
				</p>
			</div>
			<div className="flex-1 overflow-y-auto p-6">
				<div className="mx-auto max-w-lg space-y-8">
					<div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
						<div>
							<p className="text-sm font-medium">Welcome Guide</p>
							<p className="text-xs text-muted-foreground">
								Re-open the onboarding wizard
							</p>
						</div>
						<button
							type="button"
							onClick={onShowOnboarding}
							className="rounded-xl border border-border/60 px-4 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
						>
							Show Guide
						</button>
					</div>
					<div className="h-px bg-border/60" />
					<div className="space-y-3">
						<div className="flex items-center gap-2">
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
								className="text-muted-foreground"
							>
								<path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
							</svg>
							<label className="text-sm font-medium">Keyboard Shortcuts</label>
						</div>
						<div className="space-y-2">
							{[
								["Ctrl + N", "New session"],
								["Ctrl + B", "Toggle sidebar"],
								["Ctrl + K", "Focus chat input"],
							].map(([key, desc]) => (
								<div
									key={key}
									className="flex items-center justify-between rounded-lg px-3 py-2"
								>
									<span className="text-xs text-muted-foreground">{desc}</span>
									<kbd className="rounded-md border border-border/80 bg-secondary/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
										{key}
									</kbd>
								</div>
							))}
						</div>
					</div>
					<div className="h-px bg-border/60" />
					<div className="space-y-3">
						<label className="text-sm font-medium">API Key</label>
						<p className="text-xs text-muted-foreground">
							Your Anthropic API key for authenticating requests.
						</p>
						<Input
							type="password"
							placeholder="sk-ant-..."
							value={apiKey}
							onChange={(e) => onApiKeyChange(e.target.value)}
							className="font-mono text-sm rounded-xl"
						/>
					</div>
					<div className="h-px bg-border/60" />
					<div className="space-y-3">
						<label className="text-sm font-medium">Base URI</label>
						<p className="text-xs text-muted-foreground">
							Optional proxy URL for API requests. Leave empty for default.
						</p>
						<Input
							type="url"
							placeholder="https://api.anthropic.com"
							value={baseUri}
							onChange={(e) => onBaseUriChange(e.target.value)}
							className="font-mono text-sm rounded-xl"
						/>
					</div>
					<div className="h-px bg-border/60" />
					<div className="space-y-3">
						<div className="flex items-center gap-2">
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
								className="text-muted-foreground"
							>
								<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
								<path d="M9 18c-4.51 2-5-2-7-2" />
							</svg>
							<label className="text-sm font-medium">GitHub</label>
						</div>
						<p className="text-xs text-muted-foreground">
							For pushing to GitHub repos. Token needs repo scope.
						</p>
						<Input
							placeholder="GitHub username"
							value={gitUser}
							onChange={(e) => onGitUserChange(e.target.value)}
							className="text-sm rounded-xl"
						/>
						<Input
							type="password"
							placeholder="ghp_..."
							value={gitToken}
							onChange={(e) => onGitTokenChange(e.target.value)}
							className="font-mono text-sm rounded-xl"
						/>
					</div>
					<div className="h-px bg-border/60" />
					<div className="space-y-3">
						<div className="flex items-center gap-2">
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
								className="text-muted-foreground"
							>
								<rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
								<path d="M12 18h.01" />
							</svg>
							<label className="text-sm font-medium">Mobile Access</label>
						</div>
						<p className="text-xs text-muted-foreground">
							Monitor your agent from your phone via QR code.
						</p>
						<div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3">
							<span className="text-sm">Enable mobile access</span>
							<button
								type="button"
								role="switch"
								aria-checked={mobileEnabled}
								onClick={() => onMobileToggle(!mobileEnabled)}
								className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
									mobileEnabled ? "bg-primary" : "bg-muted"
								}`}
							>
								<span
									className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
										mobileEnabled ? "translate-x-5" : "translate-x-0"
									}`}
								/>
							</button>
						</div>
						{!mobileEnabled && (
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">Port</label>
								<Input
									type="number"
									value={mobilePort}
									onChange={(e) => onMobilePortChange(Number(e.target.value))}
									className="text-sm rounded-xl w-32"
									disabled={mobileEnabled}
								/>
							</div>
						)}
						{mobileEnabled && mobileStatus && (
							<div className="space-y-3">
								<div className="flex items-start gap-4">
									<div
										className="shrink-0 w-36 h-36 flex items-center justify-center border border-border/60 rounded-xl bg-background"
										dangerouslySetInnerHTML={{ __html: mobileStatus.qrSvg }}
									/>
									<div className="space-y-2 text-xs min-w-0">
										<div>
											<span className="text-muted-foreground">Status: </span>
											<span className="text-green-500 font-medium">Running</span>
										</div>
										<div className="break-all">
											<span className="text-muted-foreground">URL: </span>
											<span className="font-mono text-[11px]">{mobileStatus.url}</span>
										</div>
										<div>
											<span className="text-muted-foreground">Clients: </span>
											<span>{mobileStatus.clients}</span>
										</div>
										<div className="space-y-1 pt-1">
											<label className="text-muted-foreground">Port</label>
											<Input
												type="number"
												value={mobileStatus.port}
												onChange={(e) => onMobilePortChange(Number(e.target.value))}
												className="text-sm rounded-xl w-32"
											/>
										</div>
										<button
											type="button"
											onClick={onMobileRefresh}
											className="rounded-lg border border-border/60 px-3 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
										>
											Refresh
										</button>
									</div>
								</div>
								<p className="text-xs text-muted-foreground">
									Scan with your phone camera to connect.
								</p>
							</div>
						)}
					</div>
					<div className="h-px bg-border/60" />
					<div className="space-y-3">
						<label className="text-sm font-medium">Theme</label>
						<p className="text-xs text-muted-foreground">
							Choose your preferred appearance.
						</p>
						<div className="flex gap-2">
							{themes.map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => onThemeChange(t)}
									className={`flex-1 rounded-xl border px-4 py-2.5 text-sm capitalize transition-all ${
										theme === t
											? "border-primary/40 bg-primary/10 text-foreground font-medium shadow-sm"
											: "border-border/60 bg-background text-muted-foreground hover:bg-accent/40 hover:text-foreground"
									}`}
								>
									{t}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
