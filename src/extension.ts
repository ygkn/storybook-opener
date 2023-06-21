import * as vscode from "vscode";
import { loadStoryUrlGetter } from "./getGetStoryUrl";

type WorkspaceCacheItem = (editor: vscode.TextEditor | undefined) => unknown;

const workspaceCache = new Map<string, WorkspaceCacheItem>();

const getOrFallbackFromWorkspaceCache = async (
  key: string,
  fallback: () => Promise<WorkspaceCacheItem | undefined>
): Promise<WorkspaceCacheItem | undefined> => {
  const cached = workspaceCache.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const fallbackResult = await fallback();

  if (!fallbackResult) {
    return;
  }

  workspaceCache.set(key, fallbackResult);

  return fallbackResult;
};

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;

  if (!workspaceUri) {
    await vscode.window.showErrorMessage("please open a folder as workspace");
    return;
  }

  const workingDir = workspaceUri.path;

  let storyUrl: string | null = null;

  let storybookConfigWatcher: vscode.FileSystemWatcher | undefined;

  const reload = async () => {
    const setActiveFileUrl = await getOrFallbackFromWorkspaceCache(
      workingDir,
      async () => {
        storybookConfigWatcher?.dispose();

        const config = vscode.workspace.getConfiguration(
          "storybook-opener.storybookOption"
        );

        const configDirUri = vscode.Uri.joinPath(
          workspaceUri,
          config.get<string>("configDir")!
        );

        const configDir = configDirUri.path;

        storybookConfigWatcher = vscode.workspace.createFileSystemWatcher(
          vscode.Uri.joinPath(configDirUri, "**").path
        );

        context.subscriptions.push(storybookConfigWatcher);

        storybookConfigWatcher.onDidCreate(() => reload());
        storybookConfigWatcher.onDidChange(() => reload());
        storybookConfigWatcher.onDidDelete(() => reload());

        try {
          const getStoryUrlFromPath = await loadStoryUrlGetter(
            {
              configDir,
              workingDir,
            },
            () => {
              const config = vscode.workspace.getConfiguration(
                "storybook-opener.storybookOption"
              );
              return {
                port: config.get<number>("port")!,
                host: config.get<string>("host")!,
                https: config.get<boolean>("https")!,
              };
            }
          );

          console.log("storybook-opener: READY!!");

          return async (editor) => {
            storyUrl =
              (editor &&
                (await getStoryUrlFromPath(editor.document.uri.fsPath))) ??
              null;

            vscode.commands.executeCommand(
              "setContext",
              "storybook-opener.isActiveEditorCsf",
              storyUrl !== null
            );
          };
        } catch (e) {
          // TODO: error handling when storybook config file not found

          console.log(e);

          return;
        }
      }
    );

    setActiveFileUrl?.(vscode.window.activeTextEditor);
  };

  reload();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("storybook-opener.storybookOption.configDir")
      ) {
        workspaceCache.delete(workingDir);
        reload();
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      workspaceCache.get(workingDir)?.(editor);
    }),
    vscode.commands.registerCommand("storybook-opener.open", async () => {
      if (storyUrl === null) {
        await vscode.window.showInformationMessage(
          "Please focus to editor opening story."
        );
        return;
      }

      vscode.env.openExternal(vscode.Uri.parse(storyUrl));
    })
  );
}

export function deactivate() {}
