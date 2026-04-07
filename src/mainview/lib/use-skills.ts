import { electrobun } from "@/lib/electrobun";
import type { SkillInfo, SkillSearchResult } from "shared/rpc";
import { useCallback, useState } from "react";

export type { SkillInfo, SkillSearchResult };

export function useSkills() {
	const [skills, setSkills] = useState<SkillInfo[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedSkill, setSelectedSkill] = useState<SkillInfo | null>(null);
	const [skillContent, setSkillContent] = useState<string>("");
	const [searchResults, setSearchResults] = useState<SkillSearchResult[]>([]);
	const [searching, setSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | undefined>();
	const [feedback, setFeedback] = useState<{
		type: "ok" | "err";
		msg: string;
	} | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const list = await electrobun.rpc?.request.skillsList({}) ?? [];
			setSkills(list);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, []);

	const selectSkill = useCallback(async (skill: SkillInfo) => {
		setSelectedSkill(skill);
		setSkillContent("");
		try {
			const content = await electrobun.rpc?.request.skillsGetContent({
				directory: skill.directory,
			}) ?? "";
			setSkillContent(content);
		} catch {
			// ignore
		}
	}, []);

	const search = useCallback(async (query: string) => {
		if (!query.trim()) return;
		setSearching(true);
		setSearchError(undefined);
		try {
			const result = await electrobun.rpc?.request.skillsSearch({
				query: query.trim(),
			}) ?? { results: [], error: "RPC failed" };
			setSearchResults(result.results);
			if (result.error) setSearchError(result.error);
		} catch {
			setSearchError("Search failed");
		} finally {
			setSearching(false);
		}
	}, []);

	const install = useCallback(async (pkg: string) => {
		setSearching(true);
		try {
			const result = await electrobun.rpc?.request.skillsInstall({
				package: pkg,
			}) ?? { success: false, error: "RPC failed" };
			if (result.success) {
				setFeedback({ type: "ok", msg: `Installed ${pkg}` });
				await refresh();
			} else {
				setFeedback({ type: "err", msg: result.error || "Install failed" });
			}
		} catch {
			setFeedback({ type: "err", msg: "Install failed" });
		} finally {
			setSearching(false);
		}
	}, [refresh]);

	const remove = useCallback(async (skill: SkillInfo) => {
		try {
			const result = await electrobun.rpc?.request.skillsRemove({
				directory: skill.directory,
			}) ?? { success: false, error: "RPC failed" };
			if (result.success) {
				setFeedback({ type: "ok", msg: `Removed ${skill.name}` });
				if (selectedSkill?.directory === skill.directory) {
					setSelectedSkill(null);
					setSkillContent("");
				}
				await refresh();
			} else {
				setFeedback({ type: "err", msg: result.error || "Remove failed" });
			}
		} catch {
			setFeedback({ type: "err", msg: "Remove failed" });
		}
	}, [refresh, selectedSkill]);

	const clearFeedback = useCallback(() => setFeedback(null), []);

	return {
		skills,
		loading,
		selectedSkill,
		skillContent,
		searchResults,
		searching,
		searchError,
		feedback,
		refresh,
		selectSkill,
		search,
		install,
		remove,
		clearFeedback,
	};
}
