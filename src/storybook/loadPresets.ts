import { join } from "path";

import type { CoreConfig } from "@storybook/types";

import { Directories } from "@/types/Directories";
import { requireFrom } from "@/utils/requireFrom";

import { getBuilders } from "./get-builders";

const safeRequireResolve = (
	...args: Parameters<typeof require.resolve>
): ReturnType<typeof require.resolve> | null => {
	try {
		return require.resolve(...args);
	} catch {
		return null;
	}
};

export async function loadPresets({ workingDir, configDir }: Directories) {
	const { loadMainConfig, loadAllPresets, resolveAddonName } = requireFrom(
		"@storybook/core-common",
		workingDir,
	) as typeof import("@storybook/core-common");

	const { packageJson } = (await (
		requireFrom("read-pkg-up", workingDir) as typeof import("read-pkg-up")
	)({
		cwd: workingDir,
	}))!;

	global.process.cwd = function () {
		return workingDir;
	};

	const options = {
		configDir,
		packageJson,
	};

	/**
	 * below code come from `@storybook/core-server`
	 *
	 * @see https://github.com/storybookjs/storybook/blob/9630bdd1622ba0533948445c22b96164c865d965/code/lib/core-server/src/build-static.ts#L83-L106
	 */

	const config = await loadMainConfig({ configDir, noCache: true });
	const { framework } = config;
	const corePresets: string[] = [];

	const frameworkName =
		typeof framework === "string" ? framework : framework?.name;
	if (frameworkName) {
		corePresets.push(join(frameworkName, "preset"));
	}

	let presets = await loadAllPresets({
		corePresets: [
			...[
				safeRequireResolve(
					"@storybook/core-server/dist/presets/common-preset",
					{ paths: [configDir] },
				),
			].filter((x): x is Exclude<typeof x, null> => x !== null),
			...corePresets,
		],
		overridePresets: [
			safeRequireResolve(
				"@storybook/core-server/dist/presets/common-override-preset",
				{ paths: [configDir] },
			),
		].filter((x): x is Exclude<typeof x, null> => x !== null),
		...options,
	});

	const [previewBuilder, managerBuilder] = await getBuilders({
		...options,
		presets,
	});
	const { renderer } = await presets.apply<CoreConfig>("core", {});

	presets = await loadAllPresets({
		corePresets: [
			...[
				safeRequireResolve(
					"@storybook/core-server/dist/presets/common-preset",
					{ paths: [configDir] },
				),
			].filter((x): x is Exclude<typeof x, null> => x !== null),
			...(managerBuilder.corePresets || []),
			...(previewBuilder.corePresets || []),
			...(renderer
				? [resolveAddonName(options.configDir, renderer, options)!]
				: []),
			...corePresets,
			...[
				safeRequireResolve(
					"@storybook/core-server/dist/presets/babel-cache-preset",
					{ paths: [configDir] },
				),
			].filter((x): x is Exclude<typeof x, null> => x !== null),
		],
		overridePresets: [
			...(previewBuilder.overridePresets || []),
			...[
				safeRequireResolve(
					"@storybook/core-server/dist/presets/common-override-preset",
					{ paths: [configDir] },
				),
			].filter((x): x is Exclude<typeof x, null> => x !== null),
		],
		...options,
	});

	return presets;
}
