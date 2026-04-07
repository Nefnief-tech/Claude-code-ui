import { useState } from "react";
import { Input } from "@/components/ui/input";

export function OnboardingDialog({
	open,
	onClose,
	apiKey,
	baseUri,
	onApiKeyChange,
	onBaseUriChange,
}: {
	open: boolean;
	apiKey: string;
	baseUri: string;
	onClose: () => void;
	onApiKeyChange: (v: string) => void;
	onBaseUriChange: (v: string) => void;
}) {
	const [step, setStep] = useState(0);

	if (!open) return null;

	const handleBackdropClick = () => {
		// Don't allow closing by clicking backdrop during onboarding
	};

	const handleClose = () => {
		onClose();
	};

	const steps = [
		// Step 0: Welcome
		<div key="welcome" className="flex flex-col items-center text-center space-y-5">
			<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-primary"
				>
					<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
				</svg>
			</div>
			<div className="space-y-2">
				<h1 className="text-2xl font-bold tracking-tight">cc-uui</h1>
				<p className="text-sm text-muted-foreground">
					A desktop UI for Claude Code
				</p>
			</div>
			<p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
				Chat with Claude Code in a clean interface. Manage projects, run slash
				commands, integrate with git, and connect to any provider.
			</p>
		</div>,

		// Step 1: Requirements
		<div key="requirements" className="space-y-5">
			<div className="text-center space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">
					What you'll need
				</h2>
				<p className="text-xs text-muted-foreground">
					Make sure you have these ready
				</p>
			</div>
			<div className="space-y-3">
				<div className="flex gap-3 rounded-xl border border-border/60 p-4">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
							className="text-primary"
						>
							<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
							<line x1="4" x2="4" y1="22" y2="15" />
						</svg>
					</div>
					<div className="space-y-1">
						<p className="text-sm font-medium">Claude Code CLI</p>
						<p className="text-xs text-muted-foreground">
							Install via{" "}
							<code className="rounded bg-accent/60 px-1 py-0.5 font-mono text-[11px]">
								npm install -g @anthropic-ai/claude-code
							</code>
						</p>
						<p className="text-xs text-muted-foreground">
							The agent runs locally through Claude Code.
						</p>
					</div>
				</div>
				<div className="flex gap-3 rounded-xl border border-border/60 p-4">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
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
							className="text-primary"
						>
							<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
							<path d="M9 18h6" />
							<path d="M10 22h4" />
						</svg>
					</div>
					<div className="space-y-1">
						<p className="text-sm font-medium">API Key</p>
						<p className="text-xs text-muted-foreground">
							From your provider (Anthropic, OpenRouter, etc.)
						</p>
						<p className="text-xs text-muted-foreground">
							Works with Anthropic or any OpenAI-compatible provider.
						</p>
					</div>
				</div>
			</div>
		</div>,

		// Step 2: Provider Setup
		<div key="provider" className="space-y-5">
			<div className="text-center space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">
					Connect your provider
				</h2>
				<p className="text-xs text-muted-foreground">
					You can also configure this later in Settings
				</p>
			</div>
			<div className="space-y-4">
				<div className="space-y-2">
					<label htmlFor="onboarding-api-key" className="text-sm font-medium">
						API Key
					</label>
					<Input
						id="onboarding-api-key"
						type="password"
						placeholder="sk-ant-..."
						value={apiKey}
						onChange={(e) => onApiKeyChange(e.target.value)}
						className="rounded-xl font-mono text-sm"
					/>
				</div>
				<div className="space-y-2">
					<label htmlFor="onboarding-base-uri" className="text-sm font-medium">
						Base URI
					</label>
					<Input
						id="onboarding-base-uri"
						type="url"
						placeholder="https://api.anthropic.com"
						value={baseUri}
						onChange={(e) => onBaseUriChange(e.target.value)}
						className="rounded-xl font-mono text-sm"
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					Leave Base URI empty for Anthropic. Enter a custom URL for other
					providers (OpenRouter, Together, etc.)
				</p>
			</div>
		</div>,

		// Step 3: Features Overview
		<div key="features" className="space-y-5">
			<div className="text-center space-y-1">
				<h2 className="text-lg font-semibold tracking-tight">
					What you can do
				</h2>
				<p className="text-xs text-muted-foreground">
					Here's what cc-uui has to offer
				</p>
			</div>
			<div className="grid grid-cols-2 gap-2.5">
				{[
					{
						title: "Multi-Project",
						desc: "Organize sessions by project with separate working directories",
						icon: (
							<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
						),
					},
					{
						title: "Slash Commands",
						desc: 'Type / to invoke skills and extend capabilities',
						icon: (
							<path d="m15 15-2 5L9 9l11 4-5 2zm0 0 5 5" />
						),
					},
					{
						title: "Git Integration",
						desc: "Stage, commit, and push without leaving the chat",
						icon: (
							<>
								<circle cx="18" cy="18" r="3" />
								<circle cx="6" cy="6" r="3" />
								<path d="M6 21V9a9 9 0 0 0 9 9" />
							</>
						),
					},
					{
						title: "Skills",
						desc: "Browse, install, and manage skills from the community",
						icon: (
							<>
								<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
							</>
						),
					},
					{
						title: "Any Provider",
						desc: "Use Anthropic, OpenRouter, Together, or your own proxy",
						icon: (
							<>
								<rect width="18" height="18" x="3" y="3" rx="2" />
								<path d="M3 9h18" />
								<path d="M9 21V9" />
							</>
						),
					},
				].map((feature) => (
					<div
						key={feature.title}
						className="rounded-xl border border-border/60 p-3 space-y-1.5"
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
							className="text-primary"
						>
							{feature.icon}
						</svg>
						<p className="text-sm font-medium">{feature.title}</p>
						<p className="text-xs text-muted-foreground leading-relaxed">
							{feature.desc}
						</p>
					</div>
				))}
			</div>
		</div>,
	];

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
			onClick={handleBackdropClick}
		>
			<div
				className="w-full max-w-lg rounded-2xl border border-border/60 bg-card p-8 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="min-h-[320px] flex flex-col">
					<div className="flex-1">{steps[step]}</div>

					{/* Navigation */}
					<div className="mt-6 flex items-center justify-between">
						<div>
							{step > 0 && (
								<button
									type="button"
									onClick={() => setStep(step - 1)}
									className="rounded-xl border border-border/60 px-4 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
								>
									Back
								</button>
							)}
						</div>

						{/* Step dots */}
						<div className="flex gap-1.5">
							{steps.map((_, i) => (
								<div
									key={i}
									className={`h-1.5 rounded-full transition-all ${
										i === step
											? "w-6 bg-primary"
											: "w-1.5 bg-border"
									}`}
								/>
							))}
						</div>

						<div>
							{step < 3 ? (
								<button
									type="button"
									onClick={() => setStep(step + 1)}
									className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
								>
									{step === 0 ? "Get Started" : "Next"}
								</button>
							) : (
								<button
									type="button"
									onClick={handleClose}
									className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all"
								>
									Start Using cc-uui
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
