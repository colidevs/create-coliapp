import type { Preview } from "@storybook/nextjs-vite";

import "../src/app/globals.css";

/**
 * `data-mode="light"` on a wrapping element mirrors `src/app/layout.tsx`'s
 * static root-layout attribute (console-ui-kumo.md: Kumo reads `data-mode`
 * on an ancestor via CSS `light-dark()`, never the Tailwind `dark:` variant).
 * Storybook's iframe renders a `<body>` `Preview` controls, not the app's own
 * `<html>`, so this decorator is the equivalent seam for component stories.
 */
const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},

		// 'error' (not 'todo'): fails CI on a real a11y violation, per
		// frontend-accessibility-baseline.md's "adopt now" posture for
		// @storybook/addon-a11y — dev-time-only detection with no CI
		// enforcement would leave this addon a suggestion, not a gate.
		a11y: {
			test: "error",
		},
	},
	decorators: [
		(Story) => (
			<div data-mode="light" className="bg-kumo-base text-kumo-default p-4">
				<Story />
			</div>
		),
	],
};

export default preview;
