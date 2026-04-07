import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "cc-uui:theme";

function getSystemTheme(): "light" | "dark" {
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(resolved: "light" | "dark") {
	if (resolved === "dark") {
		document.documentElement.classList.add("dark");
	} else {
		document.documentElement.classList.remove("dark");
	}
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(() => {
		return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "system";
	});

	const resolvedTheme =
		theme === "system" ? getSystemTheme() : theme;

	// Apply on mount + whenever theme changes
	useEffect(() => {
		applyTheme(resolvedTheme);
	}, [resolvedTheme]);

	// Listen for system theme changes when in "system" mode
	useEffect(() => {
		if (theme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = () => applyTheme(getSystemTheme());
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [theme]);

	const setTheme = useCallback((t: Theme) => {
		localStorage.setItem(STORAGE_KEY, t);
		setThemeState(t);
	}, []);

	return { theme, resolvedTheme, setTheme };
}
