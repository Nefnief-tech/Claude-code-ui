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

	render() {
		if (this.state.hasError) {
			const msg = this.state.error instanceof Error ? this.state.error.message : String(this.state.error);
			return (
				<div style={{ padding: 32, color: "#ef4444", fontFamily: "monospace", fontSize: 14 }}>
					<h2 style={{ fontSize: 18, marginBottom: 8 }}>UI crashed</h2>
					<pre style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{msg}</pre>
					<button
						type="button"
						onClick={() => this.setState({ hasError: false, error: null })}
						style={{
							marginTop: 16, padding: "8px 16px", borderRadius: 8, border: "1px solid #ef4444",
							background: "transparent", color: "#ef4444", cursor: "pointer",
						}}
					>
						Reload
					</button>
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
