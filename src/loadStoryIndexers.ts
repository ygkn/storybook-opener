import { loadPresets } from "./loadPresets";

export async function loadStoryIndexers(configDir: string) {
  const presets = await loadPresets(configDir);

  const storyIndexers = await presets.apply<
    import("@storybook/types").StoryIndexer[]
  >("storyIndexers", []);

  return storyIndexers;
}
