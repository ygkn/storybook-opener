import { loadCurrentCsf } from "./loadCurrentCsf";
import { loadPresets } from "./loadPresets";
import { requireFromWorkSpace } from "./requireFromWorkspace";

import type {
  ComponentTitle,
  DocsOptions,
  IndexedCSFFile,
  Path,
  StoryIndexer,
  StoryName,
  StorybookConfig,
  Tag,
} from "@storybook/types";
import { Directories } from "./types/Directories";

/**
 * code from StoryIndexGenerator.prototype.isDocsMdx()
 * https://github.com/storybookjs/storybook/blob/93d7993364ed5d0617e66b9d2a8e62a17d8717b0/code/lib/core-server/src/utils/StoryIndexGenerator.ts#L197-L199
 */
function isDocsMdx(absolutePath: string) {
  return /(?<!\.stories)\.mdx$/i.test(absolutePath);
}

export const loadStoryUrlGetter = async (
  { configDir, workingDir }: Directories,
  getOption: () => {
    port: number;
    host: string;
    https: boolean;
  }
) => {
  const { normalizeStories } = requireFromWorkSpace(
    "@storybook/core-common"
  ) as typeof import("@storybook/core-common");

  const presets = await loadPresets({ configDir, workingDir });

  const [feature, storyIndexers, stories, docsOptions] = await Promise.all([
    presets.apply<StorybookConfig["features"]>("features"),
    presets.apply<StoryIndexer[]>("storyIndexers", []),
    presets.apply("stories"),
    presets.apply<DocsOptions>("docs", {}),
  ]);

  const normalizedStories = normalizeStories(stories, {
    configDir,
    workingDir,
  });

  const { toId } = requireFromWorkSpace(
    "@storybook/csf"
  ) as typeof import("@storybook/csf");

  const { analyze } = requireFromWorkSpace(
    "@storybook/docs-mdx"
  ) as typeof import("@storybook/docs-mdx");

  const { normalizeStoryPath } = requireFromWorkSpace(
    "@storybook/core-common"
  ) as typeof import("@storybook/core-common");

  const slash = requireFromWorkSpace("slash") as typeof import("slash");

  const path = requireFromWorkSpace("path") as typeof import("path");

  const fs = requireFromWorkSpace(
    "fs/promises"
  ) as typeof import("fs/promises");

  const { userOrAutoTitle } = requireFromWorkSpace(
    "@storybook/preview-api"
  ) as typeof import("@storybook/preview-api");

  const glob = requireFromWorkSpace("globby") as typeof import("globby");

  return async (absolutePath: string): Promise<string | undefined> => {
    let type: "docs" | "story" = isDocsMdx(absolutePath) ? "docs" : "story";
    let id: string | undefined;

    // code from https://github.com/storybookjs/storybook/blob/6fddbfb859c31ff1707b9543c09986fa6216118f/code/lib/core-server/src/utils/StoryIndexGenerator.ts
    if (type === "docs") {
      const relativePath = path.relative(workingDir, absolutePath);

      if (!feature?.storyStoreV7) {
        return undefined;
      }

      const normalizedPath = normalizeStoryPath(relativePath);
      const importPath = slash(normalizedPath);

      const content = await fs.readFile(absolutePath, "utf8");

      const result: {
        title?: ComponentTitle;
        of?: Path;
        name?: StoryName;
        isTemplate?: boolean;
        imports?: Path[];
        tags?: Tag[];
      } = analyze(content);

      // Templates are not indexed
      if (result.isTemplate) {
        return undefined;
      }

      let csf: IndexedCSFFile | undefined;
      if (result.of) {
        const absoluteOf = path.resolve(
          workingDir,
          normalizeStoryPath(path.join(path.dirname(normalizedPath), result.of))
        );

        const ofDir = path.dirname(absoluteOf);

        const absoluteOfPath = (
          await Promise.all(
            normalizedStories.map(
              async ({ files }) => await glob(slash(path.join(ofDir, files)))
            )
          )
        )
          .flat()
          .find((path) => path.startsWith(absoluteOf));

        if (absoluteOfPath) {
          csf = await loadCurrentCsf(
            workingDir,
            absoluteOfPath,
            normalizedStories,
            storyIndexers
          );
        }
      }

      const title =
        csf?.meta.title ??
        userOrAutoTitle(importPath, normalizedStories, result.title);

      id = title && toId(title);
    }

    if (type === "story") {
      const csf = await loadCurrentCsf(
        workingDir,
        absolutePath,
        normalizedStories,
        storyIndexers
      );
      id = csf?.meta.title && toId(csf.meta.title);

      const { autodocs } = docsOptions;

      const componentTags = csf?.meta.tags || [];

      const componentAutodocs = componentTags.includes("autodocs");
      const autodocsOptedIn =
        autodocs === true || (autodocs === "tag" && componentAutodocs);

      if (componentTags.includes("stories-mdx") || autodocsOptedIn) {
        type = "docs";
      }
    }

    const option = getOption();

    return (
      id &&
      `${option.https ? "https" : "http"}://${option.host}:${
        option.port
      }/?path=/${type}/${id}`
    );
  };
};
