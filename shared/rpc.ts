// RPC type definitions for main process <-> webview communication
// This file defines the contract for typed RPC between Electrobun main and webview

import type { RPCSchema } from "electrobun";

// Discriminated union for agent streaming chunks
export type AgentChunkPayload =
	| { type: "text"; text: string }
	| { type: "tool_use"; toolName: string; toolInput: string }
	| { type: "tool_result"; toolUseId: string; output: string }
	| { type: "thinking"; text: string }
	| { type: "dev_server_url"; url: string }
	| { type: "done"; costUsd: number }
	| { type: "error"; error: string };

export type MessagePartRPC =
	| { type: "text"; text: string }
	| { type: "tool_use"; toolName: string; toolInput: string }
	| { type: "tool_result"; toolUseId: string; output: string }
	| { type: "thinking"; text: string };

export type ChatMessageRPC = {
	id: string;
	role: "user" | "assistant";
	parts: MessagePartRPC[];
};

export type GitStatusRPC = {
	branch: string;
	ahead: number;
	behind: number;
	staged: number;
	unstaged: number;
	untracked: number;
	insertions: number;
	deletions: number;
	modified: string[];
	stagedFiles: string[];
	untrackedFiles: string[];
};

export type GitLogEntry = {
	hash: string;
	message: string;
	author: string;
	date: string;
};

export type GitStashEntry = {
	ref: string;
	message: string;
	branch: string;
};

export type GhPrEntry = {
	number: number;
	title: string;
	author: string;
	headBranch: string;
	state: string;
	url: string;
};

export type SkillSource = "user" | "agent" | "plugin";

export type SkillInfo = {
	name: string;
	description: string;
	source: SkillSource;
	directory: string;
	contentPreview: string;
	hasReferences: boolean;
	hasScripts: boolean;
	hasData: boolean;
};

export type SkillSearchResult = {
	name: string;
	description: string;
	package: string;
	author: string;
};

export type MainRPC = {
	bun: RPCSchema<{
		requests: {
			ping: {
				params: Record<string, never>;
				response: string;
			};
			getGreeting: {
				params: Record<string, never>;
				response: string;
			};
			sendMessage: {
				params: { text: string; apiKey?: string; baseUri?: string; cwd?: string };
				response: { status: string };
			};
			abortAgent: {
				params: Record<string, never>;
				response: { status: string };
			};
			gitStatus: {
				params: { cwd: string };
				response: GitStatusRPC | null;
			};
			gitDiff: {
				params: { cwd: string; staged: boolean };
				response: string;
			};
			gitStageAll: {
				params: { cwd: string };
				response: { success: boolean; error?: string };
			};
			gitStageFiles: {
				params: { cwd: string; files: string[] };
				response: { success: boolean; error?: string };
			};
			gitCommit: {
				params: { cwd: string; message: string; user?: string };
				response: { success: boolean; error?: string };
			};
			gitPush: {
				params: { cwd: string; token?: string; user?: string };
				response: { success: boolean; error?: string };
			};
			gitFetch: {
				params: { cwd: string };
				response: { success: boolean; error?: string };
			};
			gitLog: {
				params: { cwd: string; count?: number };
				response: GitLogEntry[];
			};
			gitStashList: {
				params: { cwd: string };
				response: GitStashEntry[];
			};
			gitStashPush: {
				params: { cwd: string; message?: string };
				response: { success: boolean; error?: string };
			};
			gitStashPop: {
				params: { cwd: string; index?: number };
				response: { success: boolean; error?: string };
			};
			gitStashDrop: {
				params: { cwd: string; index: number };
				response: { success: boolean; error?: string };
			};
			ghPrList: {
				params: { cwd: string };
				response: GhPrEntry[];
			};
			ghPrCreate: {
				params: { cwd: string; title: string; body?: string; base?: string; draft?: boolean };
				response: { success: boolean; url?: string; error?: string };
			};
			gitGenerateCommitMessage: {
				params: { cwd: string; apiKey?: string; baseUri?: string };
				response: { message?: string; error?: string };
			};
			skillsList: {
				params: Record<string, never>;
				response: SkillInfo[];
			};
			skillsGetContent: {
				params: { directory: string };
				response: string;
			};
			skillsSearch: {
				params: { query: string };
				response: { results: SkillSearchResult[]; error?: string };
			};
			skillsInstall: {
				params: { package: string };
				response: { success: boolean; error?: string };
			};
			skillsRemove: {
				params: { directory: string };
				response: { success: boolean; error?: string };
			};
			mobileStart: {
				params: { port: number };
				response: { success: boolean; url?: string; qrSvg?: string; error?: string };
			};
			mobileStop: {
				params: Record<string, never>;
				response: { success: boolean };
			};
			mobileGetStatus: {
				params: Record<string, never>;
				response: { running: boolean; port: number; url: string; clients: number; qrSvg: string } | null;
			};
			mobileSyncSessions: {
				params: { sessions: { id: string; title: string }[]; activeSessionId: string | null };
				response: { success: boolean };
			};
			mobileSetMessages: {
				params: { messages: ChatMessageRPC[] };
				response: { success: boolean };
			};
			mobileSwitchSession: {
				params: { sessionId: string };
				response: { success: boolean };
			};
		};
		messages: {
			log: { msg: string };
		};
	}>;
	webview: RPCSchema<{
		requests: Record<string, never>;
		messages: {
			agentChunk: AgentChunkPayload;
			mobileSwitchRequest: { sessionId: string };
			mobileUserMessage: { text: string };
		};
	}>;
};
