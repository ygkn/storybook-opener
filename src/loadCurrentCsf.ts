import { requireFromWorkSpace } from "./requireFromWorkspace";

export async function loadCurrentCsf(
  workingDir: string,
  absolutePath: string,
  entries: import("@storybook/types").NormalizedStoriesSpecifier[],
  storyIndexers: import("@storybook/types").StoryIndexer[]
) {
  const { normalizeStoryPath } = requireFromWorkSpace(
    "@storybook/core-common"
  ) as typeof import("@storybook/core-common");
  const slash = requireFromWorkSpace("slash") as typeof import("slash");
  const { userOrAutoTitle } = requireFromWorkSpace(
    "@storybook/preview-api"
  ) as typeof import("@storybook/preview-api");
  const path = requireFromWorkSpace("path") as typeof import("path");

  /**
   * below code come from `@storybook/core-server`
   *
   * @see https://github.com/storybookjs/storybook/blob/9630bdd1622ba0533948445c22b96164c865d965/code/lib/core-server/src/utils/StoryIndexGenerator.ts
   */

  const relativePath = path.relative(workingDir, absolutePath);
  // NOTE: (extension author) get entries as argument
  // const entries = [] as IndexEntry[];
  const importPath = slash(normalizeStoryPath(relativePath));
  const makeTitle = (userTitle?: string) => {
    // NOTE: (extension author) we can not know `specifier` at now, so use `userOrAutoTitle` to find
    // return userOrAutoTitleFromSpecifier(importPath, specifier, userTitle);
    return userOrAutoTitle(importPath, entries, userTitle)!;
  };

  const storyIndexer = storyIndexers.find((indexer) =>
    indexer.test.exec(absolutePath)
  );
  if (!storyIndexer) {
    throw new Error(`No matching story indexer found for ${absolutePath}`);
  }
  const csf = await storyIndexer.indexer(absolutePath, { makeTitle });

  return csf;
}
