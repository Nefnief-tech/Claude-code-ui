import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./use-agent-chat";

const PROJECTS_KEY = "cc-uui:projects";
const OLD_SESSIONS_KEY = "cc-uui:sessions";

function truncateOldMessages(messages: ChatMessage[]): ChatMessage[] {
	const recentCount = 10;
	if (messages.length <= recentCount) return messages;
	return messages.map((msg, i) => {
		if (i >= messages.length - recentCount) return msg;
		return {
			...msg,
			parts: msg.parts.map((p) => {
				if (p.type === "text" && p.text.length > 10240) {
					return { ...p, text: p.text.slice(0, 500) + "...(truncated)" };
				}
				return p;
			}),
		};
	});
}

function truncateAllLarge(messages: ChatMessage[]): ChatMessage[] {
	return messages.map((msg) => ({
		...msg,
		parts: msg.parts.map((p) => {
			if (p.type === "text" && p.text.length > 5120) {
				return { ...p, text: p.text.slice(0, 500) + "...(truncated)" };
			}
			return p;
		}),
	}));
}

export type Session = {
	id: string;
	title: string;
	messages: ChatMessage[];
	createdAt: number;
	pinned?: boolean;
};

export type Project = {
	id: string;
	name: string;
	path: string;
	sessions: Session[];
	createdAt: number;
};

let nextId = 0;
function uid(prefix: string): string {
	return `${prefix}-${++nextId}-${Date.now()}`;
}

function loadProjects(): Project[] {
	try {
		const raw = localStorage.getItem(PROJECTS_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore corrupt data
	}
	return [];
}

function persistProjects(projects: Project[]) {
	try {
		localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
	} catch (e) {
		if (e instanceof DOMException && e.name === "QuotaExceededError") {
			// Attempt to truncate large messages and retry
			const truncated = projects.map((p) => ({
				...p,
				sessions: p.sessions.map((s) => ({
					...s,
					messages: truncateAllLarge(s.messages),
				})),
			}));
			try {
				localStorage.setItem(PROJECTS_KEY, JSON.stringify(truncated));
			} catch {
				console.warn("[projects] Failed to persist even after truncation");
			}
		} else {
			console.warn("[projects] Failed to persist:", e);
		}
	}
}

function migrateOldSessions(): Project[] {
	try {
		const raw = localStorage.getItem(OLD_SESSIONS_KEY);
		if (!raw) return [];
		const sessions: Session[] = JSON.parse(raw);
		if (sessions.length === 0) return [];
		const project: Project = {
			id: uid("proj"),
			name: "Default Project",
			path: "",
			sessions,
			createdAt: Date.now(),
		};
		const projects = [project];
		persistProjects(projects);
		localStorage.removeItem(OLD_SESSIONS_KEY);
		return projects;
	} catch {
		return [];
	}
}

export function useProjects() {
	const [projects, setProjects] = useState<Project[]>(() => {
		const loaded = loadProjects();
		if (loaded.length > 0) return loaded;
		return migrateOldSessions();
	});
	const [activeProjectId, setActiveProjectId] = useState<string | null>(
		() => {
			const loaded = loadProjects();
			const list = loaded.length > 0 ? loaded : migrateOldSessions();
			return list.length > 0 ? list[0].id : null;
		},
	);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(
		null,
	);

	// Persist whenever projects change
	useEffect(() => {
		persistProjects(projects);
	}, [projects]);

	// Set initial activeSessionId from active project
	useEffect(() => {
		if (activeSessionId) return;
		const project = projects.find((p) => p.id === activeProjectId);
		if (project && project.sessions.length > 0) {
			setActiveSessionId(project.sessions[0].id);
		}
	}, [activeProjectId, activeSessionId, projects]);

	// Derived
	const activeProject =
		projects.find((p) => p.id === activeProjectId) ?? null;
	const activeProjectSessions = activeProject?.sessions ?? [];
	const activeSession =
		activeProjectSessions.find((s) => s.id === activeSessionId) ?? null;

	// Project CRUD
	const createProject = useCallback((name: string, path: string) => {
		const id = uid("proj");
		const session: Session = {
			id: uid("sess"),
			title: "New Chat",
			messages: [],
			createdAt: Date.now(),
		};
		const project: Project = {
			id,
			name,
			path,
			sessions: [session],
			createdAt: Date.now(),
		};
		setProjects((prev) => [...prev, project]);
		setActiveProjectId(id);
		setActiveSessionId(session.id);
		return id;
	}, []);

	const deleteProject = useCallback(
		(id: string) => {
			setProjects((prev) => {
				const next = prev.filter((p) => p.id !== id);
				if (id === activeProjectId) {
					setActiveProjectId(next.length > 0 ? next[0].id : null);
					setActiveSessionId(
						next.length > 0 && next[0].sessions.length > 0
							? next[0].sessions[0].id
							: null,
					);
				}
				return next;
			});
		},
		[activeProjectId],
	);

	const renameProject = useCallback((id: string, name: string) => {
		setProjects((prev) =>
			prev.map((p) => (p.id === id ? { ...p, name } : p)),
		);
	}, []);

	const switchProject = useCallback(
		(id: string) => {
			setActiveProjectId(id);
			setProjects((prev) => {
				const project = prev.find((p) => p.id === id);
				if (project && project.sessions.length > 0) {
					setActiveSessionId(project.sessions[0].id);
				} else {
					setActiveSessionId(null);
				}
				return prev;
			});
		},
		[],
	);

	// Session CRUD (scoped to active project)
	const createSession = useCallback(() => {
		if (!activeProjectId) return null;
		const id = uid("sess");
		const session: Session = {
			id,
			title: "New Chat",
			messages: [],
			createdAt: Date.now(),
		};
		setProjects((prev) =>
			prev.map((p) =>
				p.id === activeProjectId
					? { ...p, sessions: [session, ...p.sessions] }
					: p,
			),
		);
		setActiveSessionId(id);
		return id;
	}, [activeProjectId]);

	const switchSession = useCallback((id: string) => {
		setActiveSessionId(id);
	}, []);

	const deleteSession = useCallback(
		(id: string) => {
			if (!activeProjectId) return;
			setProjects((prev) =>
				prev.map((p) => {
					if (p.id !== activeProjectId) return p;
					const next = p.sessions.filter((s) => s.id !== id);
					if (id === activeSessionId) {
						setActiveSessionId(
							next.length > 0 ? next[0].id : null,
						);
					}
					return { ...p, sessions: next };
				}),
			);
		},
		[activeProjectId, activeSessionId],
	);

	const updateSessionTitle = useCallback(
		(id: string, title: string) => {
			if (!activeProjectId) return;
			setProjects((prev) =>
				prev.map((p) =>
					p.id === activeProjectId
						? {
								...p,
								sessions: p.sessions.map((s) =>
									s.id === id ? { ...s, title } : s,
								),
							}
						: p,
				),
			);
		},
		[activeProjectId],
	);

	const updateSessionMessages = useCallback(
		(id: string, messages: ChatMessage[]) => {
			if (!activeProjectId) return;
			const safe = truncateOldMessages(messages);
			setProjects((prev) =>
				prev.map((p) =>
					p.id === activeProjectId
						? {
								...p,
								sessions: p.sessions.map((s) =>
									s.id === id ? { ...s, messages: safe } : s,
								),
							}
						: p,
				),
			);
		},
		[activeProjectId],
	);

	const pinSession = useCallback((id: string) => {
		setProjects((prev) =>
			prev.map((p) => ({
				...p,
				sessions: p.sessions.map((s) =>
					s.id === id ? { ...s, pinned: true } : s,
				),
			})),
		);
	}, []);

	const unpinSession = useCallback((id: string) => {
		setProjects((prev) =>
			prev.map((p) => ({
				...p,
				sessions: p.sessions.map((s) =>
					s.id === id ? { ...s, pinned: false } : s,
				),
			})),
		);
	}, []);

	const reorderSessions = useCallback((sessionId: string, toIndex: number) => {
		setProjects((prev) =>
			prev.map((p) => {
				const idx = p.sessions.findIndex((s) => s.id === sessionId);
				if (idx === -1 || idx === toIndex) return p;
				const next = [...p.sessions];
				const [moved] = next.splice(idx, 1);
				next.splice(toIndex, 0, moved);
				return { ...p, sessions: next };
			}),
		);
	}, []);

	return {
		projects,
		activeProjectId,
		activeSessionId,
		activeProject,
		activeProjectSessions,
		activeSession,
		createProject,
		deleteProject,
		renameProject,
		switchProject,
		createSession,
		switchSession,
		deleteSession,
		updateSessionTitle,
		updateSessionMessages,
		pinSession,
		unpinSession,
		reorderSessions,
	};
}
