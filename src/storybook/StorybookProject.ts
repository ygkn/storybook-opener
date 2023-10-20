import fs from "fs/promises";
import path from "path";

import type {
  DocsOptions,
  StoryIndexer,
  StorybookConfig,
  Indexer,
  NormalizedStoriesSpecifier,
  DeprecatedIndexer,
  ComponentTitle,
  Path,
  StoryName,
  Tag,
} from "@storybook/types";

import { Directories } from "@/types/Directories";
import { requireFrom } from "@/utils/requireFrom";

import { loadPresets } from "./loadPresets";

/**
 * @see `StoryIndexGenerator.prototype.isDocsMdx`
 * https://github.com/storybookjs/storybook/blob/ce3d0c534d4b32eddc04a4943ee7d2152b54dbce/code/lib/core-server/src/utils/StoryIndexGenerator.ts
 */
function isDocsMdx(absolutePath: string) {
  return /(?<!\.stories)\.mdx$/i.test(absolutePath);
}

const AUTODOCS_TAG = "autodocs";
const STORIES_MDX_TAG = "stories-mdx";

export class StorybookProject {
  private constructor(
    private readonly workingDir: string,
    private readonly specifiers: NormalizedStoriesSpecifier[],
    private readonly storyStoreV7: boolean,
    private readonly storyIndexers: StoryIndexer[],
    private readonly indexers: Indexer[],
    private readonly docs: DocsOptions,

    private readonly getOption: () => {
      port: number;
      host: string;
      https: boolean;
    },
  ) {}

  /**
   * @see `getStoryIndexGenerator` in `@storybook/core-server`
   * https://github.com/storybookjs/storybook/blob/4b0b3acf8c15c7b4f6a31779c3d2cccfe3526911/code/lib/core-server/src/utils/getStoryIndexGenerator.ts
   */
  public static async load(
    { workingDir, configDir }: Directories,
    getOption: StorybookProject["getOption"],
  ): Promise<StorybookProject> {
    const { normalizeStories } = requireFrom(
      "@storybook/core-common",
      workingDir,
    ) as typeof import("@storybook/core-common");

    const presets = await loadPresets({ configDir, workingDir });

    const [feature, storyIndexers, indexers, stories, docsOptions] =
      await Promise.all([
        presets.apply<StorybookConfig["features"]>("features"),
        presets.apply<StoryIndexer[]>("storyIndexers", []),
        presets.apply("experimental_indexers", []),
        presets.apply("stories"),
        presets.apply<DocsOptions>("docs", {}),
      ]);

    const specifiers = normalizeStories(stories, {
      configDir,
      workingDir,
    });

    return new StorybookProject(
      workingDir,
      specifiers,
      feature?.storyStoreV7 ?? false,
      storyIndexers,
      indexers,
      docsOptions,
      getOption,
    );
  }

  /**
   * @see `StoryIndexGenerator.prototype.updateExtracted` in `@storybook/core-server`
   * https://github.com/storybookjs/storybook/blob/ce3d0c534d4b32eddc04a4943ee7d2152b54dbce/code/lib/core-server/src/utils/StoryIndexGenerator.ts
   */
  async getStorybookUrl(
    absolutePath: string,
  ): Promise<Promise<Promise<string | undefined>>> {
    const path =
      (isDocsMdx(absolutePath)
        ? await this.getDocPath(absolutePath)
        : await this.getStoryPath(absolutePath)) ||
      (await this.getColocatedStoryPath(absolutePath));

    if (!path) {
      return undefined;
    }

    const { port, host, https } = this.getOption();

    const protocol = https ? "https" : "http";

    return `${protocol}://${host}:${port}?path=${path}`;
  }

  private async getStoryPath(
    absolutePath: string,
  ): Promise<string | undefined> {
    const { toId, storyNameFromExport } = requireFrom(
      "@storybook/csf",
      this.workingDir,
    ) as typeof import("@storybook/csf");

    const { normalizeStoryPath } = requireFrom(
      "@storybook/core-common",
      this.workingDir,
    ) as typeof import("@storybook/core-common");

    const slash = requireFrom(
      "slash",
      this.workingDir,
    ) as typeof import("slash");
    const { userOrAutoTitle } = requireFrom(
      "@storybook/preview-api",
      this.workingDir,
    ) as typeof import("@storybook/preview-api");

    const relativePath = path.relative(this.workingDir, absolutePath);
    const importPath = slash(normalizeStoryPath(relativePath));
    const defaultMakeTitle = (userTitle?: string) => {
      return userOrAutoTitle(importPath, this.specifiers, userTitle)!;
    };

    const indexer = (this.indexers as StoryIndexer[])
      .concat(this.storyIndexers)
      .find((ind) => ind.test.exec(absolutePath));

    if (indexer === undefined) {
      return undefined;
    }

    if (indexer.indexer) {
      return this.getStoryPathFromDeprecatedIndexer({
        indexer: indexer.indexer,
        indexerOptions: { makeTitle: defaultMakeTitle },
        absolutePath,
      });
    }

    const indexInputs =
      // Support v7.4.*
      // @ts-expect-error TS2551
      indexer.index !== undefined
        ? // @ts-expect-error TS2551
          await (indexer.index as typeof indexer.createIndex)(absolutePath, {
            makeTitle: defaultMakeTitle,
          })
        : await indexer.createIndex(absolutePath, {
            makeTitle: defaultMakeTitle,
          });

    const input = indexInputs[0];

    if (input === undefined) {
      return undefined;
    }

    const title = input.title ?? defaultMakeTitle();
    const id =
      input.__id ??
      toId(input.metaId ?? title, storyNameFromExport(input.exportName));

    const { autodocs } = this.docs;
    // We need a docs entry attached to the CSF file if either:
    //  a) autodocs is globally enabled
    //  b) we have autodocs enabled for this file
    //  c) it is a stories.mdx transpiled to CSF
    const hasAutodocsTag = indexInputs.some((entry) =>
      (entry.tags ?? []).includes(AUTODOCS_TAG),
    );
    const isStoriesMdx = indexInputs.some((entry) =>
      (entry.tags ?? []).includes(STORIES_MDX_TAG),
    );

    const openDoc =
      autodocs === true ||
      (autodocs === "tag" && hasAutodocsTag) ||
      isStoriesMdx;

    if (openDoc) {
      const { metaId } = input;
      const id = toId(metaId ?? title, this.docs.defaultName ?? "Docs");

      return `/docs/${id}`;
    } else {
      return `/${input.type}/${id}`;
    }
  }
  private async getStoryPathFromDeprecatedIndexer({
    indexer,
    indexerOptions,
    absolutePath,
  }: {
    indexer: DeprecatedIndexer["indexer"];
    indexerOptions: { makeTitle: (userTitle?: string) => string };
    absolutePath: string;
  }): Promise<string | undefined> {
    const { toId } = requireFrom(
      "@storybook/csf",
      this.workingDir,
    ) as typeof import("@storybook/csf");
    const csf = await indexer(absolutePath, indexerOptions);

    if (csf.stories.length) {
      const { autodocs } = this.docs;
      const componentAutodocs = (csf.meta.tags ?? []).includes(AUTODOCS_TAG);
      const autodocsOptedIn =
        autodocs === true || (autodocs === "tag" && componentAutodocs);
      // We need a docs entry attached to the CSF file if either:
      //  a) it is a stories.mdx transpiled to CSF, OR
      //  b) we have docs page enabled for this file
      if ((csf.meta.tags ?? []).includes(STORIES_MDX_TAG) || autodocsOptedIn) {
        const name = this.docs.defaultName ?? "Docs";
        const id = toId(csf.meta.id || csf.meta.title!, name);

        return `/docs/${id}`;
      }
    }

    const id = csf.stories[0]?.id;

    if (id === undefined) {
      return undefined;
    }

    return `/story/${id}`;
  }

  private async getDocPath(absolutePath: string): Promise<string | undefined> {
    const relativePath = path.relative(this.workingDir, absolutePath);

    if (!this.storyStoreV7) {
      return undefined;
    }

    const { analyze } = requireFrom(
      "@storybook/docs-mdx",
      this.workingDir,
    ) as typeof import("@storybook/docs-mdx");

    const { normalizeStoryPath } = requireFrom(
      "@storybook/core-common",
      this.workingDir,
    ) as typeof import("@storybook/core-common");

    const slash = requireFrom(
      "slash",
      this.workingDir,
    ) as typeof import("slash");

    const glob = requireFrom(
      "globby",
      this.workingDir,
    ) as typeof import("globby");

    const normalizedPath = normalizeStoryPath(relativePath);

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

    if (result.of) {
      const absoluteOf = path.resolve(
        this.workingDir,
        normalizeStoryPath(path.join(path.dirname(normalizedPath), result.of)),
      );

      const ofDir = path.dirname(absoluteOf);

      const absoluteOfPath = (
        await glob(
          this.specifiers.map(({ files }) => slash(path.join(ofDir, files))),
        )
      ).find((path) => path.startsWith(absoluteOf));

      if (absoluteOfPath) {
        return (await this.getStoryPath(absoluteOfPath))?.replace(
          "/story/",
          "/docs/",
        );
      }
    }

    return;
  }

  private async getColocatedStoryPath(
    absolutePath: string,
  ): Promise<string | undefined> {
    const glob = requireFrom(
      "globby",
      this.workingDir,
    ) as typeof import("globby");
    const slash = requireFrom(
      "slash",
      this.workingDir,
    ) as typeof import("slash");

    const dirname = path.dirname(absolutePath);

    // Leading (zero or more) dot(s) and the following dot(s)
    const filename = path.basename(absolutePath).replace(/^(\.*[^.]+).*/, "$1");

    const absoluteFilename = path.join(
      dirname,
      // If "index.*" is the target, search file has name starting with parent dirname
      filename === "index" ? path.basename(dirname) : filename,
    );

    const absoluteStoryPath = (
      await glob(
        this.specifiers.map(({ files }) => slash(path.join(dirname, files))),
      )
    ).find((path) => path.startsWith(absoluteFilename));

    if (!absoluteStoryPath) {
      return undefined;
    }

    return this.getStoryPath(absoluteStoryPath);
  }
}
