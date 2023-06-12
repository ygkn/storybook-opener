import * as vscode from "vscode";
import { loadCurrentCsf } from "./loadCurrentCsf";
import { loadStoryEntries } from "./loadStoryEntries";
import { loadStoryIndexers } from "./loadStoryIndexers";
import { requireFromWorkSpace } from "./requireFromWorkspace";

type WorkspaceCacheItem = {
  storyIndexers: import("@storybook/types").StoryIndexer[];
  entries: import("@storybook/types").NormalizedStoriesSpecifier[];
};

const workspaceCache = new Map<string, WorkspaceCacheItem>();

const getOrFallbackFromWorkspaceCache = async (
  key: string,
  fallback: () => Promise<WorkspaceCacheItem>
): Promise<WorkspaceCacheItem> => {
  const cached = workspaceCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const fallbackResult = await fallback();

  workspaceCache.set(key, fallbackResult);

  return fallbackResult;
};

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // TODO: update config etc. when config file updated
  const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;

  if (!workspaceUri) {
    await vscode.window.showErrorMessage("please open a folder as workspace");
    return;
  }

  // TODO: get `".storybook"` from extension config
  const configDir = vscode.Uri.joinPath(workspaceUri, ".storybook").path;
  const workingDir = workspaceUri.path;

  console.log(`storybook-opener: using storybook config "${configDir}"`);

  const { storyIndexers, entries } = await getOrFallbackFromWorkspaceCache(
    workingDir,
    async () => {
      const [storyIndexers, entries] = await Promise.all([
        loadStoryIndexers(configDir).then((v) => {
          console.log(
            "storybook-opener: indexers loaded!",
            v.map((indexer) => indexer.test.toString())
          );
          return v;
        }),
        loadStoryEntries(configDir, workingDir).then((v) => {
          console.log(
            "storybook-opener: entries loaded!",
            v.map((entry) => entry.files)
          );
          return v;
        }),
      ]);

      return { storyIndexers, entries };
    }
  );

  console.log("storybook-opener: READY!!");

  const { toId } = requireFromWorkSpace(
    "@storybook/csf"
  ) as typeof import("@storybook/csf");

  let storyUrl: string | null = null;

  const setIsActiveEditorCsf = async (
    editor: vscode.TextEditor | undefined
  ): Promise<void> => {
    if (editor === undefined) {
      storyUrl = null;

      vscode.commands.executeCommand(
        "setContext",
        "storybook-opener.isActiveEditorCsf",
        false
      );

      return;
    }

    const absolutePath = editor.document.uri.fsPath;

    const csf = await loadCurrentCsf(
      workingDir,
      absolutePath,
      entries,
      storyIndexers
    );

    if (csf?.meta.title === undefined) {
      storyUrl = null;

      vscode.commands.executeCommand(
        "setContext",
        "storybook-opener.isActiveEditorCsf",
        false
      );
      return;
    }

    // TODO: get port number by config
    storyUrl = `http://localhost:6006/?path=/story/${toId(csf.meta.title)}`;

    console.log("set story url:", storyUrl);

    vscode.commands.executeCommand(
      "setContext",
      "storybook-opener.isActiveEditorCsf",
      true
    );
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(setIsActiveEditorCsf)
  );

  setIsActiveEditorCsf(vscode.window.activeTextEditor);

  let disposable = vscode.commands.registerCommand(
    "storybook-opener.open",
    async () => {
      if (storyUrl === null) {
        await vscode.window.showInformationMessage(
          "Please focus to editor opening story."
        );
        return;
      }

      // TODO: open story which cursor active
      vscode.env.openExternal(vscode.Uri.parse(storyUrl));
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
