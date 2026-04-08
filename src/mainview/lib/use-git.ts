import { electrobun } from "@/lib/electrobun";
import type { GitStatusRPC, GitLogEntry, GitStashEntry, GhPrEntry } from "shared/rpc";
import { useCallback, useEffect, useRef, useState } from "react";

export type { GitStatusRPC, GitLogEntry, GitStashEntry, GhPrEntry };

export function useGit(cwd: string | undefined) {
	const [status, setStatus] = useState<GitStatusRPC | null>(null);
	const [diff, setDiff] = useState<string>("");
	const [log, setLog] = useState<GitLogEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const [stashList, setStashList] = useState<GitStashEntry[]>([]);
	const [prList, setPrList] = useState<GhPrEntry[]>([]);
	const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

	const refresh = useCallback(async () => {
		if (!cwd) {
			setStatus(null);
			setDiff("");
			setLog([]);
			setStashList([]);
			setPrList([]);
			return;
		}
		setLoading(true);
		try {
			const [s, d, l, st, pr] = await Promise.all([
				electrobun.rpc?.request.gitStatus({ cwd }) ?? null,
				electrobun.rpc?.request.gitDiff({ cwd, staged: false }) ?? "",
				electrobun.rpc?.request.gitLog({ cwd, count: 20 }) ?? [],
				electrobun.rpc?.request.gitStashList({ cwd }) ?? [],
				electrobun.rpc?.request.ghPrList({ cwd }) ?? [],
			]);
			setStatus(s);
			setDiff(d);
			setLog(l);
			setStashList(st);
			setPrList(pr);
		} catch {
			// ignore
		} finally {
			setLoading(false);
		}
	}, [cwd]);

	// Auto-refresh every 10s and on cwd change
	useEffect(() => {
		refresh();
		if (intervalRef.current) clearInterval(intervalRef.current);
		if (cwd) {
			intervalRef.current = setInterval(refresh, 10000);
		}
		return () => {
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, [cwd, refresh]);

	const stageAll = useCallback(async () => {
		if (!cwd) return;
		await electrobun.rpc?.request.gitStageAll({ cwd });
		await refresh();
	}, [cwd, refresh]);

	const stageFiles = useCallback(
		async (files: string[]) => {
			if (!cwd) return;
			await electrobun.rpc?.request.gitStageFiles({ cwd, files });
			await refresh();
		},
		[cwd, refresh],
	);

	const commit = useCallback(
		async (message: string, user?: string) => {
			if (!cwd) return { success: false, error: "No cwd" };
			const result = await electrobun.rpc?.request.gitCommit({
				cwd,
				message,
				user,
			});
			await refresh();
			return result ?? { success: false, error: "RPC failed" };
		},
		[cwd, refresh],
	);

	const push = useCallback(
		async (token?: string, user?: string) => {
			if (!cwd) return { success: false, error: "No cwd" };
			const result = await electrobun.rpc?.request.gitPush({
				cwd,
				token,
				user,
			});
			await refresh();
			return result ?? { success: false, error: "RPC failed" };
		},
		[cwd, refresh],
	);

	const fetchRemote = useCallback(async () => {
		if (!cwd) return { success: false, error: "No cwd" };
		const result = await electrobun.rpc?.request.gitFetch({ cwd });
		await refresh();
		return result ?? { success: false, error: "RPC failed" };
	}, [cwd, refresh]);

	const getStagedDiff = useCallback(async () => {
		if (!cwd) return "";
		return (
			(await electrobun.rpc?.request.gitDiff({ cwd, staged: true })) ?? ""
		);
	}, [cwd]);

	const stashPush = useCallback(async (message?: string) => {
		if (!cwd) return { success: false, error: "No cwd" };
		const result = await electrobun.rpc?.request.gitStashPush({ cwd, message });
		await refresh();
		return result ?? { success: false, error: "RPC failed" };
	}, [cwd, refresh]);

	const stashPop = useCallback(async (index?: number) => {
		if (!cwd) return { success: false, error: "No cwd" };
		const result = await electrobun.rpc?.request.gitStashPop({ cwd, index });
		await refresh();
		return result ?? { success: false, error: "RPC failed" };
	}, [cwd, refresh]);

	const stashDrop = useCallback(async (index: number) => {
		if (!cwd) return { success: false, error: "No cwd" };
		const result = await electrobun.rpc?.request.gitStashDrop({ cwd, index });
		await refresh();
		return result ?? { success: false, error: "RPC failed" };
	}, [cwd, refresh]);

	const prCreate = useCallback(async (title: string, body?: string, base?: string, draft?: boolean) => {
		if (!cwd) return { success: false, error: "No cwd" };
		const result = await electrobun.rpc?.request.ghPrCreate({ cwd, title, body, base, draft });
		await refresh();
		return result ?? { success: false, error: "RPC failed" };
	}, [cwd, refresh]);

	const generateCommitMsg = useCallback(async (apiKey?: string, baseUri?: string) => {
		if (!cwd) return { error: "No cwd" };
		return await electrobun.rpc?.request.gitGenerateCommitMessage({ cwd, apiKey, baseUri }) ?? { error: "RPC failed" };
	}, [cwd]);

	return {
		status,
		diff,
		log,
		stashList,
		prList,
		loading,
		refresh,
		stageAll,
		stageFiles,
		commit,
		push,
		fetchRemote,
		getStagedDiff,
		stashPush,
		stashPop,
		stashDrop,
		prCreate,
		generateCommitMsg,
	};
}
