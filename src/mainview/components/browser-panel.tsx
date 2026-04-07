import { useCallback, useEffect, useRef, useState } from "react";

type BrowserPanelProps = {
	url: string;
	onClose: () => void;
};

export function BrowserPanel({ url, onClose }: BrowserPanelProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const webviewRef = useRef<any>(null);
	const [inputUrl, setInputUrl] = useState(url);

	// Create webview on mount
	useEffect(() => {
		if (!containerRef.current) return;
		const el = document.createElement("electrobun-webview") as any;
		el.style.width = "100%";
		el.style.height = "100%";
		el.src = url;
		el.addEventListener("did-navigate", (e: any) => {
			const navUrl = e?.url ?? e?.detail?.url ?? "";
			if (navUrl) {
				setInputUrl(navUrl);
			}
		});
		containerRef.current.appendChild(el);
		webviewRef.current = el;
		return () => {
			el.remove();
			webviewRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Navigate when url prop changes
	useEffect(() => {
		const el = webviewRef.current;
		if (el && typeof el.loadURL === "function") {
			el.loadURL(url);
			setInputUrl(url);
		}
	}, [url]);

	const handleNavigate = useCallback(() => {
		const el = webviewRef.current;
		if (el && inputUrl.trim()) {
			if (typeof el.loadURL === "function") {
				el.loadURL(inputUrl.trim());
			} else {
				el.src = inputUrl.trim();
			}
		}
	}, [inputUrl]);

	const handleBack = useCallback(() => {
		const el = webviewRef.current;
		if (el && typeof el.goBack === "function") el.goBack();
	}, []);

	const handleForward = useCallback(() => {
		const el = webviewRef.current;
		if (el && typeof el.goForward === "function") el.goForward();
	}, []);

	const handleRefresh = useCallback(() => {
		const el = webviewRef.current;
		if (el && typeof el.reload === "function") el.reload();
	}, []);

	return (
		<div className="flex flex-col h-full">
			{/* Toolbar */}
			<div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/60 bg-card/50 shrink-0">
				<button
					type="button"
					onClick={handleBack}
					className="p-1.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
					title="Back"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="m15 18-6-6 6-6" />
					</svg>
				</button>
				<button
					type="button"
					onClick={handleForward}
					className="p-1.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
					title="Forward"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="m9 18 6-6-6-6" />
					</svg>
				</button>
				<button
					type="button"
					onClick={handleRefresh}
					className="p-1.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
					title="Refresh"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
						<path d="M3 3v5h5" />
						<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
						<path d="M16 16h5v5" />
					</svg>
				</button>
				<input
					type="text"
					value={inputUrl}
					onChange={(e) => setInputUrl(e.target.value)}
					onKeyDown={(e) => { if (e.key === "Enter") handleNavigate(); }}
					className="flex-1 min-w-0 h-7 px-2 text-xs font-mono bg-secondary/50 rounded border border-border/40 focus:outline-none focus:ring-1 focus:ring-ring"
				/>
				<button
					type="button"
					onClick={onClose}
					className="p-1.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
					title="Close panel"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M18 6 6 18" /><path d="m6 6 12 12" />
					</svg>
				</button>
			</div>
			{/* Webview container */}
			<div ref={containerRef} className="flex-1 min-h-0" />
		</div>
	);
}
