import { Electroview } from "electrobun/view";
import type { MainRPC } from "shared/rpc";

const rpc = Electroview.defineRPC<MainRPC>({
	maxRequestTime: 5000,
	handlers: {
		requests: {},
		messages: {
			agentChunk: () => {
				// Placeholder — actual handling is done via event listeners in use-agent-chat
			},
			mobileSwitchRequest: () => {
				// Placeholder — actual handling is done via event listeners in app.tsx
			},
		},
	},
});

export const electrobun = new Electroview({ rpc });
