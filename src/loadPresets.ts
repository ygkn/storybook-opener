import { join } from "path";

import { Directories } from "./types/Directories";
import { requireFrom } from "./utils/requireFrom";

export async function loadPresets({ workingDir, configDir }: Directories) {
  const { loadMainConfig, loadAllPresets, resolveAddonName } = requireFrom(
    "@storybook/core-common",
    workingDir
  ) as typeof import("@storybook/core-common");
  const { packageJson } = (await (
    requireFrom("read-pkg-up", workingDir) as typeof import("read-pkg-up")
  )({
    cwd: workingDir,
  }))!;

  global.process.cwd = function () {
    return workingDir;
  };

  type CoreConfig = import("@storybook/types").CoreConfig;

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
    overridePresets: [],
    ...options,
  });

  // TODO
  // const [previewBuilder, managerBuilder] = await getBuilders({
  //   ...options,
  //   presets,
  // });
  const { renderer } = await presets.apply<CoreConfig>("core", {});

  presets = await loadAllPresets({
    corePresets: [
      // NOTE: (extension author) set configDir as require.resolve paths
      require.resolve("@storybook/core-server/dist/presets/common-preset", {
        paths: [workingDir],
      }),
      // TODO
      // ...(managerBuilder.corePresets || []),
      // ...(previewBuilder.corePresets || []),
      ...(renderer
        ? [resolveAddonName(options.configDir, renderer, options)!]
        : []),
      ...corePresets,
      // NOTE: (extension author) set configDir as require.resolve paths
      require.resolve(
        "@storybook/core-server/dist/presets/babel-cache-preset",
        {
          paths: [workingDir],
        }
      ),
    ],
    // TODO
    // overridePresets: previewBuilder.overridePresets || [],
    overridePresets: [],
    ...options,
  });

  return presets;
}
