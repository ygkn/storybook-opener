import path from "node:path";

import slash from "slash";
import type { StoryIndexGenerator } from "storybook/internal/core-server";
import type { IndexEntry, Path } from "storybook/internal/types";

import type { Directories } from "@/types/Directories";
import { requireFrom } from "@/utils/requireFrom";

const toFilename = (absolutePath: string): string => {
	// Leading (zero or more) dot(s) and the following dot(s)
	// e.g. (Button.tsx, Button.module.css, Button.test.tsx) -> Button
	return absolutePath.replace(/^(\.*[^.]+).*/, "$1");
};

const toImportPath = (workingDir: string, absolutePath: Path) => {
	const relativePath = path.relative(workingDir, absolutePath);
	return slash(
		relativePath.startsWith(".") ? relativePath : `./${relativePath}`,
	);
};

const createImportPathToIndexEntryMap = async (
	generator: StoryIndexGenerator,
) => {
	return Object.values((await generator.getIndex()).entries).reduce(
		(acc, entry) => {
			// First entry wins by default, but if a docs type entry comes later, it overwrites the existing entry

			// If an entry with the same import path doesn't exist, add it to the map
			if (!acc.has(entry.importPath)) {
				acc.set(entry.importPath, entry);
				return acc;
			}

			// If a docs type entry comes later, overwrite the existing entry
			if (entry.type === "docs") {
				acc.set(entry.importPath, entry);
			}

			// Otherwise, keep the existing entry
			return acc;
		},
		new Map<string, IndexEntry>(),
	);
};

const createImportFilenameToColocatedStoryPathMap = async (
	generator: StoryIndexGenerator,
) =>
	new Map<string, string>(
		Object.values((await generator.getIndex()).entries).map((entry) => [
			toFilename(entry.importPath),
			entry.importPath,
		]),
	);

export class StorybookProject {
	private readonly workingDir: string;
	private readonly storyIndexGenerator: StoryIndexGenerator;
	private mapImportPathToIndexEntry: Map<string, IndexEntry>;
	private mapImportFilenameToColocatedStoryPath: Map<string, string>;
	private readonly getOption: () => {
		port: number;
		host: string;
		https: boolean;
	};

	private constructor({
		workingDir,
		storyIndexGenerator,
		getOption,
		mapImportPathToIndexEntry,
		mapImportFilenameToColocatedStoryPath,
	}: {
		workingDir: string;
		storyIndexGenerator: StoryIndexGenerator;
		getOption: () => {
			port: number;
			host: string;
			https: boolean;
		};
		mapImportPathToIndexEntry: Map<string, IndexEntry>;
		mapImportFilenameToColocatedStoryPath: Map<string, string>;
	}) {
		this.workingDir = workingDir;
		this.storyIndexGenerator = storyIndexGenerator;
		this.getOption = getOption;
		this.mapImportPathToIndexEntry = mapImportPathToIndexEntry;
		this.mapImportFilenameToColocatedStoryPath =
			mapImportFilenameToColocatedStoryPath;
	}

	public static async load(
		{ workingDir, configDir }: Directories,
		getOption: StorybookProject["getOption"],
	): Promise<{
		storybookProject: StorybookProject;
		storiesGlob: string[];
	}> {
		// HACK: Storybook uses `process.cwd` to resolve the working directory.
		// So we need to override it to use the working directory of the extension.
		process.cwd = () => workingDir;

		const { normalizeStories } = requireFrom(
			"storybook/internal/common",
			workingDir,
		) as typeof import("storybook/internal/common");

		const { StoryIndexGenerator, experimental_loadStorybook } = requireFrom(
			"storybook/internal/core-server",
			workingDir,
		) as typeof import("storybook/internal/core-server");

		const { presets } = await experimental_loadStorybook({
			configDir,
			packageJson: {},
		});

		const stories = await presets.apply("stories", []);
		const docs = await presets.apply("docs", {});
		const indexers = await presets.apply("experimental_indexers", []);
		const generator = new StoryIndexGenerator(
			normalizeStories(stories, { configDir, workingDir }),
			{
				configDir,
				workingDir,
				indexers,
				docs,
			},
		);

		await generator.initialize();

		const mapImportPathToIndexEntry =
			await createImportPathToIndexEntryMap(generator);
		const mapImportFilenameToColocatedStoryPath =
			await createImportFilenameToColocatedStoryPathMap(generator);

		return {
			storybookProject: new StorybookProject({
				workingDir,
				storyIndexGenerator: generator,
				getOption,
				mapImportPathToIndexEntry,
				mapImportFilenameToColocatedStoryPath,
			}),
			storiesGlob: generator.specifiers.map((ns) =>
				slash(`${workingDir}/${ns.directory}/${ns.files}`),
			),
		};
	}
	private getDirectStorybookUrl(absolutePath: string): string | undefined {
		const indexEntry = this.mapImportPathToIndexEntry.get(absolutePath);
		if (!indexEntry) {
			return undefined;
		}
		const { port, host, https } = this.getOption();
		const protocol = https ? "https" : "http";
		return `${protocol}://${host}:${port}?path=/${indexEntry.type}/${indexEntry.id}`;
	}

	private getColocatedStorybookUrl(absolutePath: string): string | undefined {
		const dirname = path.dirname(absolutePath);

		const filename = toFilename(path.basename(absolutePath));

		const absoluteFilename = path.join(
			dirname,
			// If "index.*" is the target, search file has name starting with parent dirname
			filename === "index" ? path.basename(dirname) : filename,
		);

		const importFilename = toImportPath(this.workingDir, absoluteFilename);

		const colocatedStoryPath =
			this.mapImportFilenameToColocatedStoryPath.get(importFilename);

		if (!colocatedStoryPath) {
			return undefined;
		}

		return this.getDirectStorybookUrl(colocatedStoryPath);
	}

	getStorybookUrl(absolutePath: string): string | undefined {
		return (
			this.getDirectStorybookUrl(absolutePath) ??
			this.getColocatedStorybookUrl(absolutePath)
		);
	}

	async invalidate(absolutePath: string, removed: boolean): Promise<void> {
		const importPath = toImportPath(this.workingDir, absolutePath);
		const matchingSpecifier = this.storyIndexGenerator.specifiers.find(
			(specifier) => specifier.importPathMatcher.test(importPath),
		);
		if (matchingSpecifier) {
			this.storyIndexGenerator.invalidate(
				matchingSpecifier,
				importPath,
				removed,
			);
		}

		this.mapImportFilenameToColocatedStoryPath =
			await createImportFilenameToColocatedStoryPathMap(
				this.storyIndexGenerator,
			);

		this.mapImportPathToIndexEntry = await createImportPathToIndexEntryMap(
			this.storyIndexGenerator,
		);
	}

	async invalidateAll(): Promise<void> {
		this.storyIndexGenerator.invalidateAll();

		this.mapImportFilenameToColocatedStoryPath =
			await createImportFilenameToColocatedStoryPathMap(
				this.storyIndexGenerator,
			);

		this.mapImportPathToIndexEntry = await createImportPathToIndexEntryMap(
			this.storyIndexGenerator,
		);
	}
}
