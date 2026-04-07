import { ChatView } from "./chat-view";
import { DashboardView } from "./dashboard-view";
import { SettingsView } from "./settings-view";
import { SkillsView } from "./skills-view";
import { Sidebar } from "./sidebar";
import { GitPanel } from "./git-panel";
import { BrowserPanel } from "./browser-panel";
import { AddProjectDialog } from "./add-project-dialog";
import { OnboardingDialog } from "./onboarding-dialog";
import { useAgentChat } from "@/lib/use-agent-chat";
import { electrobun } from "@/lib/electrobun";
import { useProjects } from "@/lib/use-projects";
import { useGit } from "@/lib/use-git";
import { useSkills } from "@/lib/use-skills";
import { useTheme } from "@/lib/use-theme";
import { useCallback, useEffect, useRef, useState } from "react";

function ResizeHandle({
	onDragStart,
	onDrag,
}: {
	onDragStart: () => void;
	onDrag: (startX: number, currentX: number) => void;
}) {
	return (
		<div
			className="w-2 shrink-0 cursor-col-resize rounded-full hover:bg-border/60 transition-colors"
			onMouseDown={(e) => {
				e.preventDefault();
				const startX = e.clientX;
				onDragStart();
				document.body.style.cursor = "col-resize";
				document.body.style.userSelect = "none";
				const onMove = (ev: MouseEvent) => onDrag(startX, ev.clientX);
				const onUp = () => {
					document.body.style.cursor = "";
					document.body.style.userSelect = "";
					document.removeEventListener("mousemove", onMove);
					document.removeEventListener("mouseup", onUp);
				};
				document.addEventListener("mousemove", onMove);
				document.addEventListener("mouseup", onUp);
			}}
		/>
	);
}

export function App() {
	const [activeView, setActiveView] = useState<"chat" | "dashboard" | "settings" | "skills">("chat");
	const { theme, resolvedTheme, setTheme } = useTheme();
	const {
		projects,
		activeProjectId,
		activeSessionId,
		activeProject,
		activeProjectSessions,
		createProject,
		deleteProject,
		renameProject,
		switchProject,
		createSession,
		switchSession,
		deleteSession,
		updateSessionTitle,
		updateSessionMessages,
	} = useProjects();
	const {
		messages,
		isStreaming,
		sendMessage,
		abort,
		setCredentials,
		loadMessages,
		setActiveSession,
		devServerUrl,
		clearDevServerUrl,
		sessionCost,
		estimatedTokens,
	} = useAgentChat();

	const {
		status: gitStatus,
		diff: gitDiff,
		log: gitLog,
		loading: gitLoading,
		refresh: gitRefresh,
		stageAll: gitStageAll,
		commit: gitCommit,
		push: gitPush,
		fetchRemote: gitFetch,
	} = useGit(activeProject?.path || undefined);

	const {
		skills: skillList,
		loading: skillsLoading,
		selectedSkill,
		skillContent,
		searchResults,
		searching: skillsSearching,
		searchError: skillsSearchError,
		feedback: skillsFeedback,
		refresh: skillsRefresh,
		selectSkill,
		search: skillsSearch,
		install: skillsInstall,
		remove: skillsRemove,
		clearFeedback: skillsClearFeedback,
	} = useSkills();

	// Load skills on startup so slash commands work in chat
	useEffect(() => {
		skillsRefresh();
	}, [skillsRefresh]);

	const [apiKey, setApiKey] = useState(
		() => localStorage.getItem("cc-uui:apiKey") ?? "",
	);
	const [baseUri, setBaseUri] = useState(
		() => localStorage.getItem("cc-uui:baseUri") ?? "",
	);
	const [gitUser, setGitUser] = useState(
		() => localStorage.getItem("cc-uui:gitUser") ?? "",
	);
	const [gitToken, setGitToken] = useState(
		() => localStorage.getItem("cc-uui:gitToken") ?? "",
	);
	const [showAddProjectDialog, setShowAddProjectDialog] = useState(false);
	const [showGitPanel, setShowGitPanel] = useState(false);
	const [showBrowserPanel, setShowBrowserPanel] = useState(false);
	const [showOnboarding, setShowOnboarding] = useState(
		() => !localStorage.getItem("cc-uui:onboarded"),
	);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [chatPanelWidth, setChatPanelWidth] = useState(400);
	const chatWidthAtDragStart = useRef(400);
	const mainRef = useRef<HTMLElement>(null);
	const chatViewRef = useRef<{ focusInput: () => void }>(null);
	const [toast, setToast] = useState<string | null>(null);
	const toastTimer = useRef<ReturnType<typeof setTimeout>>();

	// Mobile access state
	type MobileStatus = {
		running: boolean;
		port: number;
		url: string;
		clients: number;
		qrSvg: string;
	};
	const [mobileEnabled, setMobileEnabled] = useState(
		() => localStorage.getItem("cc-uui:mobileEnabled") === "1",
	);
	const [mobilePort, setMobilePort] = useState(
		() => Number(localStorage.getItem("cc-uui:mobilePort")) || 8420,
	);
	const [mobileStatus, setMobileStatus] = useState<MobileStatus | null>(null);

	// Refs to break the load↔persist cycle
	const projectsRef = useRef(projects);
	projectsRef.current = projects;
	const loadingRef = useRef(false);

	// Sync credentials
	useEffect(() => {
		localStorage.setItem("cc-uui:apiKey", apiKey);
		localStorage.setItem("cc-uui:baseUri", baseUri);
		setCredentials(apiKey, baseUri);
	}, [apiKey, baseUri, setCredentials]);

	// Sync git credentials
	useEffect(() => {
		localStorage.setItem("cc-uui:gitUser", gitUser);
		localStorage.setItem("cc-uui:gitToken", gitToken);
	}, [gitUser, gitToken]);

	// Persist mobile settings
	useEffect(() => {
		localStorage.setItem("cc-uui:mobileEnabled", mobileEnabled ? "1" : "0");
		localStorage.setItem("cc-uui:mobilePort", String(mobilePort));
	}, [mobileEnabled, mobilePort]);

	// Auto-start mobile server on mount if previously enabled
	useEffect(() => {
		if (mobileEnabled) {
			electrobun.rpc?.request.mobileStart({ port: mobilePort }).then((res) => {
				if (res?.success && res.url && res.qrSvg) {
					setMobileStatus({ running: true, port: mobilePort, url: res.url, clients: 0, qrSvg: res.qrSvg });
				}
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Sync sessions to mobile server whenever they or active session change
	// (also triggers when messages change via activeSessionId dep chain)
	useEffect(() => {
		if (!mobileEnabled) return;
		const sessionList = activeProjectSessions.map((s) => ({
			id: s.id,
			title: s.title,
		}));
		electrobun.rpc?.request.mobileSyncSessions({
			sessions: sessionList,
			activeSessionId,
		});
	}, [activeProjectSessions, activeSessionId, mobileEnabled]);

	// Push current messages to mobile server after session load/switch
	useEffect(() => {
		if (!mobileEnabled || !activeSessionId) return;
		if (loadingRef.current) return; // skip during initial load
		electrobun.rpc?.request.mobileSetMessages({ messages });
	}, [messages, activeSessionId, mobileEnabled]);

	// Listen for mobile session switch requests
	useEffect(() => {
		const handler = (data: { sessionId: string }) => {
			switchSession(data.sessionId);
			setActiveView("chat");
		};
		electrobun.rpc?.addMessageListener("mobileSwitchRequest", handler);
	}, [switchSession]);

	// Load messages when switching sessions
	useEffect(() => {
		const project = projectsRef.current.find(
			(p) => p.id === activeProjectId,
		);
		const session = project?.sessions.find(
			(s) => s.id === activeSessionId,
		);
		loadingRef.current = true;
		loadMessages(session ? session.messages : []);
		setActiveSession(activeSessionId);
	}, [activeProjectId, activeSessionId, loadMessages, setActiveSession]);

	// Persist messages back to session (skip right after a load)
	useEffect(() => {
		if (loadingRef.current) {
			loadingRef.current = false;
			return;
		}
		if (activeSessionId) {
			updateSessionMessages(activeSessionId, messages);
		}
	}, [messages, activeSessionId, updateSessionMessages]);

	// Auto-derive session title from first user message
	useEffect(() => {
		if (!activeSessionId) return;
		const firstUserMsg = messages.find((m) => m.role === "user");
		if (firstUserMsg) {
			const textPart = firstUserMsg.parts.find((p) => p.type === "text");
			if (textPart && textPart.type === "text") {
				const title =
					textPart.text.slice(0, 50) +
					(textPart.text.length > 50 ? "..." : "");
				updateSessionTitle(activeSessionId, title);
			}
		}
	}, [messages, activeSessionId, updateSessionTitle]);

	// Ensure at least one project with one session exists on mount
	useEffect(() => {
		if (projects.length === 0) {
			createProject("Default Project", "");
		} else if (
			activeProject &&
			activeProject.sessions.length === 0
		) {
			createSession();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleNewSession = useCallback(() => {
		createSession();
		setActiveView("chat");
	}, [createSession]);

	const handleSwitchSession = useCallback(
		(id: string) => {
			switchSession(id);
			setActiveView("chat");
		},
		[switchSession],
	);

	const handleDeleteSession = useCallback(
		(id: string) => {
			deleteSession(id);
			if (activeProjectSessions.length <= 1) {
				createSession();
			}
		},
		[deleteSession, activeProjectSessions.length, createSession],
	);

	const handleSwitchProject = useCallback(
		(id: string) => {
			switchProject(id);
			setActiveView("chat");
		},
		[switchProject],
	);

	const handleDeleteProject = useCallback(
		(id: string) => {
			deleteProject(id);
			if (projects.length <= 1) {
				createProject("Default Project", "");
			}
		},
		[deleteProject, projects.length, createProject],
	);

	const handleOpenDashboard = useCallback(() => {
		setActiveView("dashboard");
	}, []);

	const handleOpenChat = useCallback(
		(projectId: string) => {
			switchProject(projectId);
			setActiveView("chat");
		},
		[switchProject],
	);

	const handleCreateProject = useCallback(
		(name: string, path: string) => {
			createProject(name, path);
			setShowAddProjectDialog(false);
			setActiveView("chat");
		},
		[createProject],
	);

	const handleToggleTheme = useCallback(() => {
		setTheme(resolvedTheme === "dark" ? "light" : "dark");
	}, [resolvedTheme, setTheme]);

	const handleOnboardingClose = useCallback(() => {
		localStorage.setItem("cc-uui:onboarded", "1");
		setShowOnboarding(false);
	}, []);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (e.ctrlKey || e.metaKey) {
				if (e.key === "n") {
					e.preventDefault();
					handleNewSession();
				} else if (e.key === "b") {
					e.preventDefault();
					setSidebarCollapsed((c) => !c);
				} else if (e.key === "k") {
					e.preventDefault();
					chatViewRef.current?.focusInput();
				}
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [handleNewSession]);

	const handleShowOnboarding = useCallback(() => {
		localStorage.removeItem("cc-uui:onboarded");
		setShowOnboarding(true);
	}, []);

	// Auto-open browser panel when a dev server URL is detected
	useEffect(() => {
		if (devServerUrl) {
			setShowBrowserPanel(true);
			clearTimeout(toastTimer.current);
			setToast("Dev server started — browser panel opened");
			toastTimer.current = setTimeout(() => setToast(null), 3000);
		}
	}, [devServerUrl]);

	const handleCloseBrowserPanel = useCallback(() => {
		setShowBrowserPanel(false);
		clearDevServerUrl();
	}, [clearDevServerUrl]);

	const handleSendMessage = useCallback(
		(text: string, cwd?: string, skillContent?: string) => {
			sendMessage(text, cwd || activeProject?.path || undefined, skillContent);
		},
		[sendMessage, activeProject],
	);

	const handleGitCommit = useCallback(
		async (msg: string) => {
			await gitCommit(msg, gitUser || undefined);
		},
		[gitCommit, gitUser],
	);

	const handleGitPush = useCallback(async () => {
		await gitPush(gitToken || undefined, gitUser || undefined);
	}, [gitPush, gitToken, gitUser]);

	const handleMobileToggle = useCallback(async (enabled: boolean) => {
		if (enabled) {
			const res = await electrobun.rpc?.request.mobileStart({ port: mobilePort });
			if (res?.success && res.url && res.qrSvg) {
				setMobileStatus({ running: true, port: mobilePort, url: res.url, clients: 0, qrSvg: res.qrSvg });
			}
		} else {
			await electrobun.rpc?.request.mobileStop({});
			setMobileStatus(null);
		}
		setMobileEnabled(enabled);
	}, [mobilePort]);

	const handleMobileRefresh = useCallback(async () => {
		const status = await electrobun.rpc?.request.mobileGetStatus({});
		if (status) setMobileStatus(status);
	}, []);

	const handleMobilePortChange = useCallback((port: number) => {
		setMobilePort(port);
		if (mobileEnabled) {
			electrobun.rpc?.request.mobileStop({}).then(() => {
				electrobun.rpc?.request.mobileStart({ port }).then((res) => {
					if (res?.success && res.url && res.qrSvg) {
						setMobileStatus({ running: true, port, url: res.url, clients: 0, qrSvg: res.qrSvg });
					}
				});
			});
		}
	}, [mobileEnabled]);

	return (
		<div className="flex h-screen bg-background p-2 gap-2">
			<Sidebar
				projects={projects}
				activeProjectId={activeProjectId}
				activeSessionId={activeSessionId}
				activeView={activeView}
				sessions={activeProjectSessions}
				gitDiffSummary={
					gitStatus
						? {
								insertions: gitStatus.insertions,
								deletions: gitStatus.deletions,
							}
						: null
				}
				collapsed={sidebarCollapsed}
				onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
				onSwitchProject={handleSwitchProject}
				onDeleteProject={handleDeleteProject}
				onRenameProject={renameProject}
				onAddProject={() => setShowAddProjectDialog(true)}
				onSwitchSession={handleSwitchSession}
				onNewSession={handleNewSession}
				onDeleteSession={handleDeleteSession}
				onOpenDashboard={handleOpenDashboard}
				onOpenSettings={() => setActiveView("settings")}
				onOpenSkills={() => setActiveView("skills")}
				onToggleTheme={handleToggleTheme}
				resolvedTheme={resolvedTheme}
			/>
			<main ref={mainRef} className="flex-1 min-w-0 h-full flex gap-2">
				<div
					className="min-w-0 rounded-xl overflow-hidden border border-border/60 bg-card/30 h-full"
					style={
						showBrowserPanel && devServerUrl
							? { width: chatPanelWidth + "px", flexShrink: 0 }
							: { flex: "1 1 0%" }
					}
				>
					{activeView === "dashboard" ? (
						<DashboardView
							projects={projects}
							activeProjectId={activeProjectId}
							onSwitchProject={handleSwitchProject}
							onDeleteProject={handleDeleteProject}
							onAddProject={() => setShowAddProjectDialog(true)}
							onOpenChat={handleOpenChat}
						/>
					) : activeView === "settings" ? (
						<SettingsView
							apiKey={apiKey}
							baseUri={baseUri}
							theme={theme}
							gitUser={gitUser}
							gitToken={gitToken}
							mobileEnabled={mobileEnabled}
							mobilePort={mobilePort}
							mobileStatus={mobileStatus}
							onApiKeyChange={setApiKey}
							onBaseUriChange={setBaseUri}
							onThemeChange={setTheme}
							onGitUserChange={setGitUser}
							onGitTokenChange={setGitToken}
							onShowOnboarding={handleShowOnboarding}
							onMobileToggle={handleMobileToggle}
							onMobilePortChange={handleMobilePortChange}
							onMobileRefresh={handleMobileRefresh}
						/>
					) : activeView === "skills" ? (
						<SkillsView
							skills={skillList}
							loading={skillsLoading}
							selectedSkill={selectedSkill}
							skillContent={skillContent}
							searchResults={searchResults}
							searching={skillsSearching}
							searchError={skillsSearchError}
							feedback={skillsFeedback}
							onRefresh={skillsRefresh}
							onSelectSkill={selectSkill}
							onSearch={skillsSearch}
							onInstall={skillsInstall}
							onRemove={skillsRemove}
							onClearFeedback={skillsClearFeedback}
							onClose={() => setActiveView("chat")}
						/>
					) : (
						<ChatView
							ref={chatViewRef}
							messages={messages}
							isStreaming={isStreaming}
							sendMessage={handleSendMessage}
							abort={abort}
							sessionCost={sessionCost}
							estimatedTokens={estimatedTokens}
							showGitPanel={showGitPanel}
							onToggleGitPanel={() => setShowGitPanel((p) => !p)}
							hasGitChanges={
								gitStatus
									? gitStatus.staged +
											gitStatus.unstaged +
											gitStatus.untracked >
										0
									: false
							}
							skills={skillList}
							onGetSkillContent={(directory) =>
								electrobun.rpc?.request.skillsGetContent({ directory }) ?? Promise.resolve("")
							}
						/>
					)}
				</div>
				{activeView === "chat" && showBrowserPanel && devServerUrl && (
					<>
						<ResizeHandle
							onDragStart={() => { chatWidthAtDragStart.current = chatPanelWidth; }}
							onDrag={(startX, currentX) => {
								const newWidth = chatWidthAtDragStart.current + (currentX - startX);
								const clamped = Math.max(300, newWidth);
								const max = mainRef.current ? mainRef.current.offsetWidth - 200 - 4 : Infinity;
								setChatPanelWidth(Math.min(clamped, max));
							}}
						/>
						<div className="flex-1 min-w-0 rounded-xl overflow-hidden border border-border/60 bg-card/30 h-full">
							<BrowserPanel url={devServerUrl} onClose={handleCloseBrowserPanel} />
						</div>
					</>
				)}
				{activeView === "chat" && showGitPanel && (
					<div className="w-80 shrink-0 rounded-xl overflow-hidden border border-border/60 bg-card/30 h-full">
						<GitPanel
							status={gitStatus}
							diff={gitDiff}
							log={gitLog}
							loading={gitLoading}
							onStageAll={gitStageAll}
							onCommit={handleGitCommit}
							onPush={handleGitPush}
							onFetch={gitFetch}
							onRefresh={gitRefresh}
							gitUser={gitUser}
							gitToken={gitToken}
						/>
					</div>
				)}
			</main>
			<AddProjectDialog
				open={showAddProjectDialog}
				onClose={() => setShowAddProjectDialog(false)}
				onSubmit={handleCreateProject}
			/>
			<OnboardingDialog
				open={showOnboarding}
				onClose={handleOnboardingClose}
				apiKey={apiKey}
				baseUri={baseUri}
				onApiKeyChange={setApiKey}
				onBaseUriChange={setBaseUri}
			/>
			{toast && (
				<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-border/60 bg-card px-4 py-2 text-sm text-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
					{toast}
				</div>
			)}
		</div>
	);
}
