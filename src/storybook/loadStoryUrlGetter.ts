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

import { Directories } from "@/types/Directories";
import { requireFrom } from "@/utils/requireFrom";

import { loadCurrentCsf } from "./loadCurrentCsf";
import { loadPresets } from "./loadPresets";

/**
 * code from StoryIndexGenerator.prototype.isDocsMdx()
 * https://github.com/storybookjs/storybook/blob/93d7993364ed5d0617e66b9d2a8e62a17d8717b0/code/lib/core-server/src/utils/StoryIndexGenerator.ts#L197-L199
 */
function isDocsMdx(absolutePath: string) {
  return /(?<!\.stories)\.mdx$/i.test(absolutePath);
}

/** @private */
export const loadStoryUrlGetter = async (
  { configDir, workingDir }: Directories,
  getOption: () => {
    port: number;
    host: string;
    https: boolean;
  },
) => {
  const { normalizeStories } = requireFrom(
    "@storybook/core-common",
    workingDir,
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

  const { toId } = requireFrom(
    "@storybook/csf",
    workingDir,
  ) as typeof import("@storybook/csf");

  const { analyze } = requireFrom(
    "@storybook/docs-mdx",
    workingDir,
  ) as typeof import("@storybook/docs-mdx");

  const { normalizeStoryPath } = requireFrom(
    "@storybook/core-common",
    workingDir,
  ) as typeof import("@storybook/core-common");

  const slash = requireFrom("slash", workingDir) as typeof import("slash");

  const path = requireFrom("path", workingDir) as typeof import("path");

  const fs = requireFrom(
    "fs/promises",
    workingDir,
  ) as typeof import("fs/promises");

  const { userOrAutoTitle } = requireFrom(
    "@storybook/preview-api",
    workingDir,
  ) as typeof import("@storybook/preview-api");

  const glob = requireFrom("globby", workingDir) as typeof import("globby");

  // same algorithm of `StoryIndexGenerator.prototype.extractDocs`
  // https://github.com/storybookjs/storybook/blob/next/code/lib/core-server/src/utils/StoryIndexGenerator.ts
  const getDocsPath = async (absolutePath: string) => {
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
        normalizeStoryPath(path.join(path.dirname(normalizedPath), result.of)),
      );

      const ofDir = path.dirname(absoluteOf);

      const absoluteOfPath = (
        await glob(
          normalizedStories.map(({ files }) => slash(path.join(ofDir, files))),
        )
      ).find((path) => path.startsWith(absoluteOf));

      if (absoluteOfPath) {
        csf = await loadCurrentCsf(
          workingDir,
          absoluteOfPath,
          normalizedStories,
          storyIndexers,
        );
      }
    }

    const title =
      csf?.meta.title ??
      userOrAutoTitle(importPath, normalizedStories, result.title);

    return title && `/docs/${toId(title)}`;
  };

  // same algorithm of `StoryIndexGenerator.prototype.extractStories`
  // https://github.com/storybookjs/storybook/blob/next/code/lib/core-server/src/utils/StoryIndexGenerator.ts
  const getStoryPath = async (absolutePath: string) => {
    const csf = await loadCurrentCsf(
      workingDir,
      absolutePath,
      normalizedStories,
      storyIndexers,
    );

    const { autodocs } = docsOptions;

    const componentTags = csf?.meta.tags || [];

    const componentAutodocs = componentTags.includes("autodocs");
    const autodocsOptedIn =
      autodocs === true || (autodocs === "tag" && componentAutodocs);

    return (
      csf?.meta.title &&
      `/${
        componentTags.includes("stories-mdx") || autodocsOptedIn
          ? "docs"
          : "story"
      }/${csf.stories[0]!.id}`
    );
  };

  const getColocatedStoryPath = async (absolutePath: string) => {
    const dirname = path.dirname(absolutePath);

    // Leading (zero or more) dot(s) and the following dot(s)
    const filename = path.basename(absolutePath).replace(/^(\.*[^.]+).*/, "$1");

    const absoluteFilename = path.join(dirname, filename);

    const absoluteStoryPath = (
      await glob(
        normalizedStories.map(({ files }) => slash(path.join(dirname, files))),
      )
    ).find((path) => path.startsWith(absoluteFilename));

    return absoluteStoryPath && getStoryPath(absoluteStoryPath);
  };

  return async (absolutePath: string): Promise<string | undefined> => {
    const path =
      (isDocsMdx(absolutePath)
        ? await getDocsPath(absolutePath)
        : await getStoryPath(absolutePath)) ||
      (await getColocatedStoryPath(absolutePath));

    console.log(path);

    const option = getOption();

    return (
      path &&
      `${option.https ? "https" : "http"}://${option.host}:${
        option.port
      }/?path=${path}`
    );
  };
};
