import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	root: "src/mobile",
	build: {
		outDir: "../../dist/mobile",
		emptyOutDir: false,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src/mainview"),
			"@mobile": path.resolve(__dirname, "src/mobile"),
			shared: path.resolve(__dirname, "shared"),
		},
	},
});
