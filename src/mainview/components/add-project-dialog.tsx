import { useState } from "react";
import { Input } from "./ui/input";

export function AddProjectDialog({
	open,
	onClose,
	onSubmit,
}: {
	open: boolean;
	onClose: () => void;
	onSubmit: (name: string, path: string) => void;
}) {
	const [name, setName] = useState("");
	const [path, setPath] = useState("");

	if (!open) return null;

	const canCreate = name.trim().length > 0 && path.trim().length > 0;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!canCreate) return;
		onSubmit(name.trim(), path.trim());
		setName("");
		setPath("");
	};

	const handleClose = () => {
		setName("");
		setPath("");
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
			onClick={handleClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="mb-5 flex items-center justify-between">
					<div>
						<h2 className="text-lg font-semibold tracking-tight">
							New Project
						</h2>
						<p className="mt-0.5 text-xs text-muted-foreground">
							Create a project to organize your chat sessions.
						</p>
					</div>
					<button
						type="button"
						onClick={handleClose}
						className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 6 6 18M6 6l12 12" />
						</svg>
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					<div className="space-y-2">
						<label
							htmlFor="project-name"
							className="block text-sm font-medium"
						>
							Project Name
						</label>
						<Input
							id="project-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My Project"
							autoFocus
							className="rounded-xl"
						/>
					</div>
					<div className="space-y-2">
						<label
							htmlFor="project-path"
							className="block text-sm font-medium"
						>
							Directory Path
						</label>
						<Input
							id="project-path"
							value={path}
							onChange={(e) => setPath(e.target.value)}
							placeholder="/home/user/projects/my-app"
							className="rounded-xl font-mono text-sm"
						/>
						<p className="text-xs text-muted-foreground">
							The agent will run in this directory.
						</p>
					</div>

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={handleClose}
							className="rounded-xl border border-border/60 px-5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={!canCreate}
							className="rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-all"
						>
							Create Project
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
