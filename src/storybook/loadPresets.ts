import { join } from "path";

import type { CoreConfig } from "@storybook/types";

import { Directories } from "@/types/Directories";
import { requireFrom } from "@/utils/requireFrom";

import { getBuilders } from "./get-builders";

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
      // NOTE: (extension author) set configDir as require.resolve paths
      require.resolve("@storybook/core-server/dist/presets/common-preset", {
        paths: [configDir],
      }),
      ...corePresets,
    ],
    overridePresets: [
      require.resolve(
        "@storybook/core-server/dist/presets/common-override-preset",
        {
          paths: [configDir],
        },
      ),
    ],
    ...options,
  });

  const [previewBuilder, managerBuilder] = await getBuilders({
    ...options,
    presets,
  });
  const { renderer } = await presets.apply<CoreConfig>("core", {});

  presets = await loadAllPresets({
    corePresets: [
      // NOTE: (extension author) set workingDir as require.resolve paths
      require.resolve("@storybook/core-server/dist/presets/common-preset", {
        paths: [workingDir],
      }),
      ...(managerBuilder.corePresets || []),
      ...(previewBuilder.corePresets || []),
      ...(renderer
        ? [resolveAddonName(options.configDir, renderer, options)!]
        : []),
      ...corePresets,
      // NOTE: (extension author) set workingDir as require.resolve paths
      require.resolve(
        "@storybook/core-server/dist/presets/babel-cache-preset",
        {
          paths: [workingDir],
        },
      ),
    ],
    overridePresets: [
      ...(previewBuilder.overridePresets || []),
      require.resolve(
        "@storybook/core-server/dist/presets/common-override-preset",
        {
          paths: [configDir],
        },
      ),
    ],
    ...options,
  });

  return presets;
}
