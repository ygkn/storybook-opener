import * as vscode from "vscode";
import { loadStoryUrlGetter } from "./getGetStoryUrl";

type WorkspaceCacheItem = (editor: vscode.TextEditor | undefined) => unknown;

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

  let storyUrl: string | null = null;

  console.log(`storybook-opener: using storybook config "${configDir}"`);

  const setIsActiveEditorCsf = await getOrFallbackFromWorkspaceCache(
    workingDir,
    async () => {
      const getStoryUrlFromPath = await loadStoryUrlGetter({
        configDir,
        workingDir,
      });
      return async (editor) => {
        storyUrl =
          (editor && (await getStoryUrlFromPath(editor.document.uri.fsPath))) ??
          null;

        vscode.commands.executeCommand(
          "setContext",
          "storybook-opener.isActiveEditorCsf",
          storyUrl !== null
        );
      };
    }
  );

  console.log("storybook-opener: READY!!");

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
