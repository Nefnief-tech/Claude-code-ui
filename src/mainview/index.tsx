import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./components/app";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: unknown }> {
	state = { hasError: false, error: null as unknown };

	static getDerivedStateFromError(error: unknown) {
		return { hasError: true, error };
	}

	componentDidCatch(error: unknown, info: React.ErrorInfo) {
		console.error("[ErrorBoundary] UI crashed:", error, info.componentStack);
	}

	render() {
		if (this.state.hasError) {
			const msg = this.state.error instanceof Error ? this.state.error.message : String(this.state.error);
			return (
				<div style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					padding: 32,
					background: "oklch(0.15 0.02 260)",
					color: "oklch(0.9 0.01 260)",
					fontFamily: "system-ui, -apple-system, sans-serif",
				}}>
					<div style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 48,
						height: 48,
						borderRadius: 12,
						background: "oklch(0.6 0.15 260 / 0.15)",
						marginBottom: 16,
					}}>
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(0.6 0.15 260)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
							<path d="M12 9v4" />
							<path d="M12 17h.01" />
						</svg>
					</div>
					<h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h2>
					<pre style={{
						whiteSpace: "pre-wrap",
						opacity: 0.6,
						fontSize: 13,
						maxWidth: 480,
						textAlign: "center",
						marginBottom: 24,
						fontFamily: "monospace",
					}}>{msg}</pre>
					<div style={{ display: "flex", gap: 8 }}>
						<button
							type="button"
							onClick={() => this.setState({ hasError: false, error: null })}
							style={{
								padding: "8px 20px",
								borderRadius: 8,
								border: "1px solid oklch(0.4 0.02 260)",
								background: "transparent",
								color: "oklch(0.8 0.01 260)",
								cursor: "pointer",
								fontSize: 14,
							}}
						>
							Try Again
						</button>
						<button
							type="button"
							onClick={() => location.reload()}
							style={{
								padding: "8px 20px",
								borderRadius: 8,
								border: "none",
								background: "oklch(0.6 0.15 260)",
								color: "oklch(0.98 0.01 260)",
								cursor: "pointer",
								fontSize: 14,
								fontWeight: 500,
							}}
						>
							Reload App
						</button>
					</div>
				</div>
			);
		}
		return this.props.children;
	}
}

createRoot(rootElement).render(
	<StrictMode>
		<ErrorBoundary>
			<App />
		</ErrorBoundary>
	</StrictMode>,
);
