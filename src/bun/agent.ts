import { existsSync, realpathSync } from "node:fs";
import type { AgentChunkPayload } from "shared/rpc";

let currentProc: ReturnType<typeof Bun.spawn> | null = null;

export function findClaudeBinary(): string {
	const candidates = [
		"/usr/local/bin/claude",
		"/home/linuxbrew/.linuxbrew/bin/claude",
	];

	for (const candidate of candidates) {
		try {
			const real = realpathSync(candidate);
			if (real) return real;
		} catch {
			// not found, continue
		}
	}

	const which = Bun.which("claude");
	if (which) {
		try {
			return realpathSync(which);
		} catch {
			return which;
		}
	}

	throw new Error(
		"Could not find claude CLI. Install it with `brew install claude-code` or ensure it's on PATH.",
	);
}

export function buildCleanEnv(overrides?: { apiKey?: string; baseUri?: string }): Record<string, string | undefined> {
	const env: Record<string, string | undefined> = { ...process.env };
	// Strip all Claude-related env vars to avoid conflicts from parent process
	delete env.CLAUDECODE;
	delete env.CLAUDE_CODE_ENTRYPOINT;
	delete env.ANTHROPIC_AUTH_TOKEN;
	delete env.ANTHROPIC_DEFAULT_OPUS_MODEL;
	delete env.ANTHROPIC_DEFAULT_SONNET_MODEL;
	delete env.ANTHROPIC_DEFAULT_HAIKU_MODEL;
	delete env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC;
	delete env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
	delete env.ANTHROPIC_BASE_URL;
	delete env.ANTHROPIC_API_KEY;

	if (overrides?.apiKey) {
		env.ANTHROPIC_API_KEY = overrides.apiKey;
	}
	if (overrides?.baseUri) {
		env.ANTHROPIC_BASE_URL = overrides.baseUri;
	}
	return env;
}

export function startAgent(
	prompt: string,
	onChunk: (chunk: AgentChunkPayload) => void,
	envOverrides?: { apiKey?: string; baseUri?: string; cwd?: string },
): void {
	const env = buildCleanEnv(envOverrides);
	const cwd = envOverrides?.cwd && existsSync(envOverrides.cwd)
		? envOverrides.cwd
		: undefined;

	console.log("[agent] API key set:", !!env.ANTHROPIC_API_KEY, "| Base URL:", env.ANTHROPIC_BASE_URL || "(default)");
	console.log("[agent] Spawning claude --output-format stream-json, cwd:", cwd || "(none)");

	const args = [
		"--print", prompt,
		"--output-format", "stream-json",
		"--verbose",
		"--dangerously-skip-permissions",
	];

	const proc = Bun.spawn({
		cmd: [findClaudeBinary(), ...args],
		cwd: cwd || undefined,
		env,
		stdout: "pipe",
		stderr: "pipe",
	});

	currentProc = proc;

	// Drain stderr to logs
	const stderrReader = proc.stderr.getReader();
	(async () => {
		while (true) {
			const { done, value } = await stderrReader.read();
			if (done) break;
			const text = new TextDecoder().decode(value);
			console.error("[agent:stderr]", text.trimEnd());
		}
	})();

	// Parse streaming JSON from stdout
	(async () => {
		try {
			const reader = proc.stdout.getReader();
			const decoder = new TextDecoder();
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;

					try {
						const msg = JSON.parse(trimmed);
						parseStreamMessage(msg, onChunk);
					} catch {
						// Not JSON — might be plain text output
						onChunk({ type: "text", text: trimmed });
					}
				}
			}

			// Flush remaining buffer
			if (buffer.trim()) {
				try {
					const msg = JSON.parse(buffer.trim());
					parseStreamMessage(msg, onChunk);
				} catch {
					onChunk({ type: "text", text: buffer.trim() });
				}
			}

			await proc.exited;
			onChunk({ type: "done", costUsd: 0 });
		} catch (err) {
			console.error("[agent] Error:", err);
			onChunk({
				type: "error",
				error: err instanceof Error ? err.message : String(err),
			});
		} finally {
			currentProc = null;
		}
	})();
}

const LOCALHOST_RE = /https?:\/\/localhost:\d+(?:\/[^\s"'`]*)?/g;

function detectDevServerUrls(text: string, onChunk: (chunk: AgentChunkPayload) => void): void {
	for (const match of text.matchAll(LOCALHOST_RE)) {
		onChunk({ type: "dev_server_url", url: match[0] });
	}
}

function parseStreamMessage(msg: Record<string, any>, onChunk: (chunk: AgentChunkPayload) => void): void {
	// Stream JSON format: each line is a JSON object with a "type" field
	switch (msg.type) {
		case "assistant": {
			// Assistant message with full content blocks (not deltas)
			const content = msg.message?.content as Array<Record<string, any>> | undefined;
			if (Array.isArray(content)) {
				for (const block of content) {
					if (block.type === "text" && typeof block.text === "string") {
						onChunk({ type: "text", text: block.text });
						detectDevServerUrls(block.text, onChunk);
					} else if (block.type === "thinking" && typeof block.thinking === "string") {
						onChunk({ type: "thinking", text: block.thinking });
					} else if (block.type === "tool_use") {
						onChunk({
							type: "tool_use",
							toolName: block.name as string,
							toolInput: JSON.stringify(block.input),
						});
					}
				}
			}
			break;
		}
		case "content_block_start": {
			break;
		}
		case "content_block_delta": {
			const delta = msg.delta as Record<string, unknown> | undefined;
			if (delta) {
				if (delta.type === "text_delta" && typeof delta.text === "string") {
					onChunk({ type: "text", text: delta.text });
				} else if (delta.type === "thinking_delta" && typeof delta.thinking === "string") {
					onChunk({ type: "thinking", text: delta.thinking });
				}
			}
			break;
		}
		case "content_block_stop": {
			break;
		}
		case "user": {
			const content = (msg.message as Record<string, any>)?.content;
			if (Array.isArray(content)) {
				for (const block of content) {
					if (typeof block === "object" && block?.type === "tool_result") {
						const output = typeof block.content === "string"
							? block.content
							: JSON.stringify(block.content);
						onChunk({
							type: "tool_result",
							toolUseId: block.tool_use_id as string,
							output,
						});
						detectDevServerUrls(output, onChunk);
					}
				}
			}
			break;
		}
		case "result": {
			if (msg.subtype === "success") {
				onChunk({ type: "done", costUsd: (msg.total_cost_usd as number) ?? 0 });
			} else {
				onChunk({
					type: "error",
					error: `Agent error: ${msg.subtype ?? "unknown"}`,
				});
			}
			break;
		}
		case "system": {
			// System messages (init, etc.) — ignore
			break;
		}
		default: {
			// Unknown message type — try to extract text if present
			if (typeof msg.text === "string") {
				onChunk({ type: "text", text: msg.text });
			}
			break;
		}
	}
}

export function abortAgent(): { status: string } {
	if (currentProc) {
		currentProc.kill();
		currentProc = null;
		return { status: "aborted" };
	}
	return { status: "no_active_agent" };
}
