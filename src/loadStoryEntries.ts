import { requireFromWorkSpace } from "./requireFromWorkspace";

export async function loadStoryEntries(configDir: string, workingDir: string) {
  const { loadMainConfig, normalizeStories } = requireFromWorkSpace(
    "@storybook/core-common"
  ) as typeof import("@storybook/core-common");

  const config = await loadMainConfig({
    configDir,
  });

  const entries = normalizeStories(config.stories, {
    configDir,
    workingDir,
  });

  return entries;
}
