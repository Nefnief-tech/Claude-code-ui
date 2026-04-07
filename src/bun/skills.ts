import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SkillInfo, SkillSearchResult, SkillSource } from "shared/rpc";

function parseFrontmatter(raw: string): { name: string; description: string } {
	const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
	if (!match) return { name: "", description: "" };
	const fm = match[1];
	let name = "";
	let description = "";
	for (const line of fm.split("\n")) {
		if (line.startsWith("name:")) {
			name = line.slice(5).trim().replace(/^["']|["']$/g, "");
		} else if (line.startsWith("description:")) {
			description = line.slice(12).trim().replace(/^["']|["']$/g, "");
		}
	}
	return { name, description };
}

function scanSkillDirectory(dirPath: string, source: SkillSource): SkillInfo | null {
	const skillFile = join(dirPath, "SKILL.md");
	if (!existsSync(skillFile)) return null;

	const raw = readFileSync(skillFile, "utf-8");
	const { name, description } = parseFrontmatter(raw);

	const contentPreview = raw
		.replace(/^---[\s\S]*?---\n*/, "")
		.trim()
		.slice(0, 200);

	const hasReferences = existsSync(join(dirPath, "references"));
	const hasScripts = existsSync(join(dirPath, "scripts"));
	const hasData = existsSync(join(dirPath, "data"));

	return {
		name: name || dirPath.split("/").pop() || "Unknown",
		description: description || "No description",
		source,
		directory: dirPath,
		contentPreview,
		hasReferences,
		hasScripts,
		hasData,
	};
}

function scanSkillRoot(rootPath: string, source: SkillSource): SkillInfo[] {
	if (!existsSync(rootPath)) return [];
	if (!statSync(rootPath).isDirectory()) return [];

	const entries = readdirSync(rootPath);
	const skills: SkillInfo[] = [];
	for (const entry of entries) {
		const fullPath = join(rootPath, entry);
		if (statSync(fullPath).isDirectory()) {
			const skill = scanSkillDirectory(fullPath, source);
			if (skill) skills.push(skill);
		}
	}
	return skills;
}

export function skillsList(): SkillInfo[] {
	const home = homedir();
	const skills: SkillInfo[] = [];

	// ~/.claude/skills/
	skills.push(...scanSkillRoot(join(home, ".claude", "skills"), "user"));

	// ~/.agents/skills/
	skills.push(...scanSkillRoot(join(home, ".agents", "skills"), "agent"));

	// ~/.claude/plugins/*/skills/
	const pluginsDir = join(home, ".claude", "plugins");
	if (existsSync(pluginsDir)) {
		for (const plugin of readdirSync(pluginsDir)) {
			const pluginSkillsDir = join(pluginsDir, plugin, "skills");
			skills.push(...scanSkillRoot(pluginSkillsDir, "plugin"));
		}
	}

	return skills;
}

export function skillsGetContent(directory: string): string {
	const home = homedir();
	const normalized = directory.replace(/^~/, home);

	// Validate path is under known skill roots
	const validRoots = [
		join(home, ".claude", "skills"),
		join(home, ".agents", "skills"),
		join(home, ".claude", "plugins"),
	];
	const isValid = validRoots.some((root) => normalized.startsWith(root));
	if (!isValid) return "";

	const skillFile = join(normalized, "SKILL.md");
	if (!existsSync(skillFile)) return "";

	return readFileSync(skillFile, "utf-8");
}

export function skillsSearch(query: string): { results: SkillSearchResult[]; error?: string } {
	try {
		const raw = execSync(`npx skills find ${JSON.stringify(query)}`, {
			encoding: "utf-8",
			timeout: 30000,
			stdio: ["pipe", "pipe", "pipe"],
		});

		// Try parsing as JSON array, fall back to line-based parsing
		try {
			const parsed = JSON.parse(raw);
			if (Array.isArray(parsed)) {
				return { results: parsed };
			}
		} catch {
			// Not JSON, try line-based
		}

		const results: SkillSearchResult[] = [];
		for (const line of raw.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			// Expected format: "package - description (author)"
			const match = trimmed.match(/^(.+?)\s*-\s*(.+?)(?:\s*\((.+?)\))?$/);
			if (match) {
				results.push({
					name: match[1].trim(),
					description: match[2].trim(),
					package: match[1].trim(),
					author: match[3]?.trim() || "",
				});
			}
		}
		return { results };
	} catch (err: unknown) {
		const msg =
			err instanceof Error
				? (err as Error & { stderr?: string }).stderr?.trim() || err.message
				: String(err);
		return { results: [], error: msg };
	}
}

export function skillsInstall(pkg: string): { success: boolean; error?: string } {
	try {
		execSync(`npx skills add ${JSON.stringify(pkg)}`, {
			encoding: "utf-8",
			timeout: 60000,
			stdio: ["pipe", "pipe", "pipe"],
		});
		return { success: true };
	} catch (err: unknown) {
		const msg =
			err instanceof Error
				? (err as Error & { stderr?: string }).stderr?.trim() || err.message
				: String(err);
		return { success: false, error: msg };
	}
}

export function skillsRemove(directory: string): { success: boolean; error?: string } {
	const home = homedir();
	const normalized = directory.replace(/^~/, home);

	// Validate path is under known skill roots
	const validRoots = [
		join(home, ".claude", "skills"),
		join(home, ".agents", "skills"),
		join(home, ".claude", "plugins"),
	];
	const isValid = validRoots.some((root) => normalized.startsWith(root));
	if (!isValid) return { success: false, error: "Invalid skill directory" };

	if (!existsSync(normalized)) return { success: false, error: "Directory not found" };

	try {
		rmSync(normalized, { recursive: true, force: true });
		return { success: true };
	} catch (err: unknown) {
		return {
			success: false,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}
