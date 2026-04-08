import { ApplicationMenu, BrowserView, BrowserWindow } from "electrobun/bun";
import type { MainRPC } from "shared/rpc";
import { startAgent, abortAgent } from "./agent";
import {
	gitStatus as getGitStatus,
	gitDiff,
	gitStageAll,
	gitStageFiles,
	gitCommit,
	gitPush,
	gitFetch,
	gitLog,
} from "./git";
import {
	skillsList as getSkillsList,
	skillsGetContent,
	skillsSearch,
	skillsInstall,
	skillsRemove,
} from "./skills";
import {
	startMobileServer,
	stopMobileServer,
	getStatus as getMobileStatus,
	onAgentChunk as relayChunkToMobile,
	setSendPromptCallback,
	setAbortCallback,
	setSwitchSessionCallback,
	syncSessions as mobileSyncSessions,
	switchSession as mobileSwitchSession,
	setMessages as mobileSetMessages,
	notifyDesktopMessage,
} from "./mobile-server";

// HMR: use Vite dev server if running, otherwise use bundled views
async function getMainViewUrl(): Promise<string> {
	try {
		const response = await fetch("http://localhost:5173");
		if (response.ok) {
			return "http://localhost:5173";
		}
	} catch {
		// Vite dev server not running, use bundled views
	}
	return "views://mainview/index.html";
}

// Application menu
ApplicationMenu.setApplicationMenu([
	{
		submenu: [
			{ label: "About cc-uui", role: "about" },
			{ type: "separator" },
			{ label: "Quit", role: "quit", accelerator: "q" },
		],
	},
	{
		label: "Edit",
		submenu: [
			{ role: "undo" },
			{ role: "redo" },
			{ type: "separator" },
			{ role: "cut" },
			{ role: "copy" },
			{ role: "paste" },
			{ role: "selectAll" },
		],
	},
]);

// Define RPC handlers for webview communication
const mainRPC = BrowserView.defineRPC<MainRPC>({
	maxRequestTime: 60000,
	handlers: {
		requests: {
			ping: () => "pong",
			getGreeting: () => "Greetings from the Bun side!",
			sendMessage: ({ text, apiKey, baseUri, cwd }) => {
				notifyDesktopMessage(text);
				startAgent(text, (chunk) => {
					mainRPC.send.agentChunk(chunk);
					relayChunkToMobile(chunk);
				}, { apiKey, baseUri, cwd });
				return { status: "started" };
			},
			abortAgent: () => {
				return abortAgent();
			},
			gitStatus: ({ cwd }) => getGitStatus(cwd),
			gitDiff: ({ cwd, staged }) => gitDiff(cwd, staged),
			gitStageAll: ({ cwd }) => gitStageAll(cwd),
			gitStageFiles: ({ cwd, files }) => gitStageFiles(cwd, files),
			gitCommit: ({ cwd, message, user }) => gitCommit(cwd, message, user),
			gitPush: ({ cwd, token, user }) => gitPush(cwd, token, user),
			gitFetch: ({ cwd }) => gitFetch(cwd),
			gitLog: ({ cwd, count }) => gitLog(cwd, count),
			skillsList: () => getSkillsList(),
			skillsGetContent: ({ directory }) => skillsGetContent(directory),
			skillsSearch: ({ query }) => skillsSearch(query),
			skillsInstall: ({ package: pkg }) => skillsInstall(pkg),
			skillsRemove: ({ directory }) => skillsRemove(directory),
			mobileStart: async ({ port }) => {
				try {
					// Wire up mobile callbacks to use same agent start logic
					setSendPromptCallback((text) => {
						// Notify desktop to prepare for chunks from mobile
						mainRPC.send.mobileUserMessage({ text });
						const apiKey = process.env.ANTHROPIC_API_KEY;
						const baseUri = process.env.ANTHROPIC_BASE_URL;
						startAgent(text, (chunk) => {
							mainRPC.send.agentChunk(chunk);
							relayChunkToMobile(chunk);
						}, { apiKey, baseUri });
					});
					setAbortCallback(() => { abortAgent(); });
					setSwitchSessionCallback((sessionId: string) => {
						mainRPC.send.mobileSwitchRequest({ sessionId });
					});
					const result = await startMobileServer(port);
					return { success: true, url: result.url, qrSvg: result.qrSvg };
				} catch (err) {
					return { success: false, error: err instanceof Error ? err.message : String(err) };
				}
			},
			mobileStop: () => {
				stopMobileServer();
				return { success: true };
			},
			mobileGetStatus: async () => {
				return await getMobileStatus();
			},
			mobileSyncSessions: ({ sessions, activeSessionId }) => {
				mobileSyncSessions(sessions, activeSessionId);
				return { success: true };
			},
			mobileSwitchSession: ({ sessionId }) => {
				mobileSwitchSession(
					[], // sessions will be provided by the next sync
					sessionId,
					[], // messages will be provided by the next setMessages
				);
				return { success: true };
			},
			mobileSetMessages: ({ messages }) => {
				mobileSetMessages(messages);
				return { success: true };
			},
		},
		messages: {
			log: ({ msg }) => {
				console.log("[Webview]:", msg);
			},
		},
	},
});

// Create main window
const mainWindow = new BrowserWindow({
	title: "cc-uui",
	url: await getMainViewUrl(),
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
	rpc: mainRPC,
});

// Handle window events
mainWindow.on("close", () => {
	console.log("Main window closed");
	process.exit(0);
});

mainWindow.webview.on("dom-ready", () => {
	console.log("Webview DOM ready");
});

// Warn if API key is not set
if (!process.env.ANTHROPIC_API_KEY) {
	console.warn(
		"WARNING: ANTHROPIC_API_KEY is not set. Agent features will not work.",
	);
}

console.log("cc-uui app started");
