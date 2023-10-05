import * as vscode from "vscode";

import { getConfig } from "./config";
import { followStory, openStory } from "./opener";
import { StorybookProject } from "./storybook";

const workspaceCache = new Map<
  string,
  {
    storybookProject: StorybookProject;
    storybookProjectConfigWatcher: vscode.FileSystemWatcher;
  }
>();

let activeEditorStoryUrl: string | null = null;

const loadWorkspace = async (workspaceFolder: vscode.WorkspaceFolder) => {
  const workingDir = workspaceFolder.uri.fsPath;

  workspaceCache.get(workingDir)?.storybookProjectConfigWatcher.dispose();

  workspaceCache.delete(workingDir);

  const config = getConfig();

  const configDir = vscode.Uri.joinPath(
    workspaceFolder.uri,
    config.storybookOption.configDir,
  ).fsPath;

  const storybookProjectConfigWatcher =
    vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        workspaceFolder,
        config.storybookOption.configDir,
      ),
    );

  storybookProjectConfigWatcher.onDidCreate(() =>
    loadWorkspace(workspaceFolder),
  );
  storybookProjectConfigWatcher.onDidChange(() =>
    loadWorkspace(workspaceFolder),
  );
  storybookProjectConfigWatcher.onDidDelete(() =>
    loadWorkspace(workspaceFolder),
  );

  try {
    const storybookProject = await StorybookProject.load(
      {
        configDir,
        workingDir,
      },
      () => getConfig().storybookOption,
    );

    workspaceCache.set(workingDir, {
      storybookProject,
      storybookProjectConfigWatcher,
    });
  } catch (e) {
    console.error(e);
  }
};

const getStoryUrlFromEditor = async (
  editor: vscode.TextEditor | undefined,
): Promise<string | null> => {
  if (editor === undefined) {
    return null;
  }

  const workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);

  if (workspace === undefined) {
    return null;
  }

  const cacheHit = workspaceCache.get(workspace.uri.fsPath);

  if (cacheHit === undefined) {
    return null;
  }

  return (
    (await cacheHit.storybookProject.getStorybookUrl(
      editor.document.uri.fsPath,
    )) ?? null
  );
};

const onCurrentEditorChanged = async (
  editor: vscode.TextEditor | undefined,
) => {
  activeEditorStoryUrl = await getStoryUrlFromEditor(editor);

  if (activeEditorStoryUrl === null) {
    vscode.commands.executeCommand(
      "setContext",
      "storybook-opener.isActiveEditorCsf",
      false,
    );
    return;
  }

  vscode.commands.executeCommand(
    "setContext",
    "storybook-opener.isActiveEditorCsf",
    true,
  );

  followStory(activeEditorStoryUrl);
};

const showWhyCannotOpenStory = async () => {
  if (vscode.window.activeTextEditor === undefined) {
    await vscode.window.showInformationMessage(
      "Please focus stories/docs file.",
    );
    return;
  }

  const workspace = vscode.workspace.getWorkspaceFolder(
    vscode.window.activeTextEditor.document.uri,
  );

  if (workspace === undefined) {
    await vscode.window.showInformationMessage("Please open workspace.");
    return;
  }

  if (workspaceCache.get(workspace.uri.fsPath) === undefined) {
    await vscode.window.showInformationMessage(
      "Something went wrong when Storybook config.",
    );
    return;
  }

  await vscode.window.showInformationMessage(
    [
      "Something went wrong when get or load yor story/docs file.",
      "Check opening file is valid or same name to story file.",
    ].join(" "),
  );
};

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (
    vscode.workspace.workspaceFolders === undefined ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    return;
  }

  Promise.all(
    vscode.workspace.workspaceFolders.map((workspaceFolder) =>
      loadWorkspace(workspaceFolder),
    ),
  ).then(() => onCurrentEditorChanged(vscode.window.activeTextEditor));

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
        if (
          event.affectsConfiguration(
            "storybook-opener.storybookOption.configDir",
            workspaceFolder,
          )
        ) {
          await loadWorkspace(workspaceFolder);
          await onCurrentEditorChanged(vscode.window.activeTextEditor);
        }
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(onCurrentEditorChanged),
    vscode.commands.registerCommand("storybook-opener.open", async () => {
      if (activeEditorStoryUrl === null) {
        await showWhyCannotOpenStory();

        return;
      }

      await openStory(activeEditorStoryUrl);
    }),
    {
      dispose() {
        for (const [_, { storybookProjectConfigWatcher }] of workspaceCache) {
          storybookProjectConfigWatcher.dispose();
        }
      },
    },
  );
}

export function deactivate() {
  //
}
