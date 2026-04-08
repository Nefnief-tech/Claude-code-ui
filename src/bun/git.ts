import { execSync } from "node:child_process";

export type GitStatus = {
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

export type GitDiffSummary = {
	insertions: number;
	deletions: number;
	files: { path: string; insertions: number; deletions: number }[];
};

function runGit(args: string, cwd: string): string | null {
	try {
		return execSync(`git ${args}`, {
			cwd,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 10000,
		}).trim();
	} catch {
		return null;
	}
}

export function isGitRepo(cwd: string): boolean {
	return runGit("rev-parse --is-inside-work-tree", cwd) === "true";
}

export function gitStatus(cwd: string): GitStatus | null {
	if (!isGitRepo(cwd)) return null;

	const branch = runGit("rev-parse --abbrev-ref HEAD", cwd) ?? "unknown";

	// Ahead/behind
	const abRaw = runGit(
		`rev-list --left-right --count HEAD...@{upstream} 2>/dev/null`,
		cwd,
	);
	let ahead = 0;
	let behind = 0;
	if (abRaw) {
		const parts = abRaw.split("\t");
		ahead = Number.parseInt(parts[0]) || 0;
		behind = Number.parseInt(parts[1]) || 0;
	}

	// Porcelain status
	const porcelain = runGit("status --porcelain=v1", cwd) ?? "";
	let staged = 0;
	let unstaged = 0;
	let untracked = 0;
	const modified: string[] = [];
	const stagedFiles: string[] = [];
	const untrackedFiles: string[] = [];

	for (const line of porcelain.split("\n")) {
		if (!line) continue;
		const x = line[0];
		const y = line[1];
		const file = line.slice(3);

		if (x === "?") {
			untracked++;
			untrackedFiles.push(file);
		} else {
			if (x !== " " && x !== "?") {
				staged++;
				stagedFiles.push(file);
			}
			if (y !== " " || x === " ") {
				unstaged++;
				if (!modified.includes(file)) modified.push(file);
			}
			if (x !== " ") modified.push(file);
		}
	}

	// Diff stats
	const { insertions, deletions } = diffStats(cwd);

	return {
		branch,
		ahead,
		behind,
		staged,
		unstaged,
		untracked,
		insertions,
		deletions,
		modified: [...new Set(modified)],
		stagedFiles,
		untrackedFiles,
	};
}

function diffStats(cwd: string): { insertions: number; deletions: number } {
	let insertions = 0;
	let deletions = 0;

	// Staged diff stats
	const stagedStat = runGit("diff --cached --numstat", cwd) ?? "";
	// Unstaged diff stats
	const unstagedStat = runGit("diff --numstat", cwd) ?? "";

	for (const line of `${stagedStat}\n${unstagedStat}`.split("\n")) {
		if (!line) continue;
		const parts = line.split("\t");
		if (parts.length >= 2) {
			insertions += Number.parseInt(parts[0]) || 0;
			deletions += Number.parseInt(parts[1]) || 0;
		}
	}

	return { insertions, deletions };
}

export function gitDiff(cwd: string, staged = false): string {
	const flag = staged ? "--cached" : "";
	return runGit(`diff ${flag}`, cwd) ?? "";
}

export function gitCommit(
	cwd: string,
	message: string,
	user?: string,
	token?: string,
): { success: boolean; error?: string } {
	try {
		if (user) {
			execSync(
				`git -c user.name="${user.replace(/"/g, '\\"')}" -c user.email="${user.replace(/"/g, '\\"')}" commit -m ${JSON.stringify(message)}`,
				{ cwd, encoding: "utf-8", timeout: 10000 },
			);
		} else {
			execSync(`git commit -m ${JSON.stringify(message)}`, {
				cwd,
				encoding: "utf-8",
				timeout: 10000,
			});
		}
		return { success: true };
	} catch (err: unknown) {
		const msg =
			err instanceof Error
				? (err as Error & { stderr?: string }).stderr?.trim() ||
					err.message
				: String(err);
		return { success: false, error: msg };
	}
}

export function gitStageAll(cwd: string): { success: boolean; error?: string } {
	try {
		execSync("git add -A", { cwd, encoding: "utf-8", timeout: 10000 });
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export function gitStageFiles(
	cwd: string,
	files: string[],
): { success: boolean; error?: string } {
	try {
		execSync(`git add -- ${files.map((f) => `"${f}"`).join(" ")}`, {
			cwd,
			encoding: "utf-8",
			timeout: 10000,
		});
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export function gitPush(
	cwd: string,
	token?: string,
	user?: string,
): { success: boolean; error?: string } {
	try {
		// Get remote URL and inject token if provided
		if (token && user) {
			const remoteUrl = runGit("config remote.origin.url", cwd);
			if (remoteUrl?.includes("github.com")) {
				const authUrl = remoteUrl.replace(
					/github.com/,
					`${user}:${token}@github.com`,
				);
				execSync(`git remote set-url origin ${authUrl}`, {
					cwd,
					encoding: "utf-8",
					timeout: 5000,
				});
			}
		}
		execSync("git push", { cwd, encoding: "utf-8", timeout: 30000 });
		// Restore original URL if we modified it
		if (token && user) {
			try {
				execSync("git remote set-url origin $(git config remote.origin.url | sed 's/[^@]*@//')", {
					cwd,
					encoding: "utf-8",
					timeout: 5000,
				});
			} catch {
				// best effort
			}
		}
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export function gitFetch(cwd: string): { success: boolean; error?: string } {
	try {
		execSync("git fetch", { cwd, encoding: "utf-8", timeout: 30000 });
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

export function gitLog(
	cwd: string,
	count = 10,
): { hash: string; message: string; author: string; date: string }[] {
	const raw = runGit(
		`log --pretty=format:"%h%x00%s%x00%an%x00%ar" -n ${count}`,
		cwd,
	);
	if (!raw) return [];
	return raw.split("\n").map((line) => {
		const [hash, message, author, date] = line.split("\0");
		return { hash: hash ?? "", message: message ?? "", author: author ?? "", date: date ?? "" };
	});
}

// --- Stash management ---

export function gitStashList(cwd: string): { ref: string; message: string; branch: string }[] {
	const raw = runGit("stash list", cwd);
	if (!raw) return [];
	return raw.split("\n").filter(Boolean).map((line) => {
		// Format: stash@{0}: On branch-name: stash message
		// or: stash@{0}: WIP on branch-name: abc1234 commit msg
		const match = line.match(/^(stash@\{\d+\}):\s+(?:On |WIP on )([^:]+):\s+(.*)/);
		if (match) {
			return { ref: match[1], branch: match[2].trim(), message: match[3].trim() };
		}
		// Fallback: just return raw line
		const colonIdx = line.indexOf(":");
		return { ref: line.slice(0, colonIdx), branch: "", message: line.slice(colonIdx + 1).trim() };
	});
}

export function gitStashPush(cwd: string, message?: string): { success: boolean; error?: string } {
	try {
		const msgArg = message ? ` -m ${JSON.stringify(message)}` : "";
		execSync(`git stash push${msgArg}`, { cwd, encoding: "utf-8", timeout: 10000 });
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error
				? (err as Error & { stderr?: string }).stderr?.trim() || err.message
				: String(err),
		};
	}
}

export function gitStashPop(cwd: string, index?: number): { success: boolean; error?: string } {
	try {
		const ref = index !== undefined ? ` stash@{${index}}` : "";
		execSync(`git stash pop${ref}`, { cwd, encoding: "utf-8", timeout: 10000 });
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error
				? (err as Error & { stderr?: string }).stderr?.trim() || err.message
				: String(err),
		};
	}
}

export function gitStashDrop(cwd: string, index: number): { success: boolean; error?: string } {
	try {
		execSync(`git stash drop stash@{${index}}`, { cwd, encoding: "utf-8", timeout: 10000 });
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error
				? (err as Error & { stderr?: string }).stderr?.trim() || err.message
				: String(err),
		};
	}
}

// --- GitHub PR integration (gh CLI) ---

function runGh(args: string, cwd: string): string | null {
	try {
		return execSync(`gh ${args}`, {
			cwd,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 15000,
		}).trim();
	} catch {
		return null;
	}
}

export function ghPrList(cwd: string): { number: number; title: string; author: string; headBranch: string; state: string; url: string }[] {
	const raw = runGh("pr list --json number,title,author,headRefName,state,url", cwd);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw) as Array<{
			number: number;
			title: string;
			author: { login: string } | null;
			headRefName: string;
			state: string;
			url: string;
		}>;
		return parsed.map((pr) => ({
			number: pr.number,
			title: pr.title,
			author: pr.author?.login ?? "unknown",
			headBranch: pr.headRefName,
			state: pr.state,
			url: pr.url,
		}));
	} catch {
		return [];
	}
}

export function ghPrCreate(
	cwd: string,
	title: string,
	body?: string,
	base?: string,
	draft?: boolean,
): { success: boolean; url?: string; error?: string } {
	try {
		let cmd = `gh pr create --title ${JSON.stringify(title)}`;
		if (body) cmd += ` --body ${JSON.stringify(body)}`;
		else cmd += ` --body ""`;
		if (base) cmd += ` --base ${JSON.stringify(base)}`;
		if (draft) cmd += " --draft";
		const result = execSync(cmd, { cwd, encoding: "utf-8", timeout: 15000 }).trim();
		// gh outputs the PR URL
		const urlMatch = result.match(/https:\/\/\S+/);
		return { success: true, url: urlMatch?.[0] ?? result };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error
				? (err as Error & { stderr?: string }).stderr?.trim() || err.message
				: String(err),
		};
	}
}

// --- AI commit message generation ---

export async function generateCommitMessage(
	cwd: string,
	apiKey?: string,
	baseUri?: string,
): Promise<{ message?: string; error?: string }> {
	// Get staged diff
	let diff = runGit("diff --cached", cwd) ?? "";

	// If no staged diff, also include unstaged as context
	if (!diff) {
		diff = runGit("diff", cwd) ?? "";
	}

	if (!diff) {
		return { error: "No changes to generate a commit message from" };
	}

	// Truncate diff to avoid oversized requests
	const maxDiffLen = 50000;
	const truncated = diff.length > maxDiffLen ? diff.slice(0, maxDiffLen) + "\n... (truncated)" : diff;

	const key = apiKey || process.env.ANTHROPIC_API_KEY;
	if (!key) {
		return { error: "No API key configured" };
	}

	const baseUrl = (baseUri || process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");

	try {
		const res = await fetch(`${baseUrl}/v1/messages`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-api-key": key,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify({
				model: "claude-haiku-4-5-20251001",
				max_tokens: 256,
				messages: [
					{
						role: "user",
						content: `Generate a concise, conventional commit message (max 72 chars subject, optional body) for these changes. Output ONLY the commit message text, nothing else.\n\n${truncated}`,
					},
				],
			}),
		});

		if (!res.ok) {
			const body = await res.text().catch(() => "");
			return { error: `API error ${res.status}: ${body.slice(0, 200)}` };
		}

		const data = (await res.json()) as {
			content: Array<{ type: string; text?: string }>;
		};
		const text = data.content?.find((b) => b.type === "text")?.text?.trim();
		if (!text) {
			return { error: "Empty response from API" };
		}

		return { message: text };
	} catch (err: unknown) {
		return {
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
