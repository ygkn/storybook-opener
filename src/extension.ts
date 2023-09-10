import * as vscode from "vscode";

import { isRunning, waitForRunning } from "./server-checking";
import { StorybookProject } from "./storybook";

type WorkspaceCacheItem = (editor: vscode.TextEditor | undefined) => unknown;

const workspaceCache = new Map<string, WorkspaceCacheItem>();

const storybookConfigWatchers = new Map<string, vscode.FileSystemWatcher>();

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  if (
    vscode.workspace.workspaceFolders === undefined ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    return;
  }

  let storyUrl: string | null = null;
  let activeEditor: vscode.TextEditor | null = null;

  const loadWorkspace = async ({
    noCache = false,
    workspaceFolder,
  }: {
    noCache?: boolean;
    workspaceFolder: vscode.WorkspaceFolder;
  }) => {
    const workingDir = workspaceFolder.uri.fsPath;

    if (noCache) {
      workspaceCache.delete(workingDir);
    }

    storybookConfigWatchers.get(workingDir)?.dispose();

    const config = vscode.workspace.getConfiguration(
      "storybook-opener.storybookOption",
      workspaceFolder,
    );

    const configDirConfig = config.get<string>("configDir")!;

    const configDir = vscode.Uri.joinPath(
      workspaceFolder.uri,
      configDirConfig,
    ).fsPath;

    const storybookConfigWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(workspaceFolder, configDirConfig),
    );

    storybookConfigWatcher.onDidCreate(() =>
      loadWorkspace({ noCache: true, workspaceFolder }),
    );
    storybookConfigWatcher.onDidChange(() =>
      loadWorkspace({ noCache: true, workspaceFolder }),
    );
    storybookConfigWatcher.onDidDelete(() =>
      loadWorkspace({ noCache: true, workspaceFolder }),
    );

    try {
      const storybookProject = await StorybookProject.load(
        {
          configDir,
          workingDir,
        },
        () => {
          const config = vscode.workspace.getConfiguration(
            "storybook-opener.storybookOption",
            workspaceFolder,
          );
          return {
            port: config.get<number>("port")!,
            host: config.get<string>("host")!,
            https: config.get<boolean>("https")!,
          };
        },
      );

      workspaceCache.set(workingDir, async (editor) => {
        if (editor === undefined) {
          return;
        }

        storyUrl =
          (await storybookProject.getStorybookUrl(
            editor.document.uri.fsPath,
          )) ?? null;

        activeEditor = storyUrl !== null ? editor : null;

        vscode.commands.executeCommand(
          "setContext",
          "storybook-opener.isActiveEditorCsf",
          storyUrl !== null,
        );
      });
    } catch (e) {
      // TODO: error handling when storybook config file not found

      console.log(e);

      return;
    }
  };

  Promise.all(
    vscode.workspace.workspaceFolders.map((workspaceFolder) =>
      loadWorkspace({ workspaceFolder }),
    ),
  ).then(() => {
    const editor = vscode.window.activeTextEditor;
    if (editor === undefined) {
      return;
    }

    const workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);

    if (workspace === undefined) {
      return;
    }

    workspaceCache.get(workspace.uri.fsPath)?.(editor);
  });

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (vscode.workspace.workspaceFolders === undefined) {
        return;
      }

      for (const workspaceFolder of vscode.workspace.workspaceFolders) {
        if (
          event.affectsConfiguration(
            "storybook-opener.storybookOption.configDir",
            workspaceFolder,
          )
        ) {
          loadWorkspace({ noCache: true, workspaceFolder });
        }
      }
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor === undefined) {
        return;
      }

      const workspace = vscode.workspace.getWorkspaceFolder(
        editor.document.uri,
      );

      if (workspace === undefined) {
        return;
      }

      workspaceCache.get(workspace.uri.fsPath)?.(editor);
    }),
    vscode.commands.registerCommand("storybook-opener.open", async () => {
      if (storyUrl === null) {
        if (vscode.window.activeTextEditor === undefined) {
          await vscode.window.showInformationMessage(
            "Please focus stories/docs file.s",
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

        return;
      }

      const storybookStarted = await isRunning(storyUrl);

      if (!storybookStarted) {
        await vscode.window
          .showInformationMessage(
            "Storybook Server seems to have not been started yet. Would you like to start?",
            "Yes",
            "No",
          )
          .then(async (answer) => {
            if (answer !== "Yes") {
              return;
            }

            const config = vscode.workspace.getConfiguration(
              "storybook-opener.storybookOption",
              activeEditor &&
                vscode.workspace.getWorkspaceFolder(activeEditor.document.uri),
            );
            const httpsOption = config.get<boolean>("https") ? "--https" : "";
            const hostOption =
              config.get<string>("host") === "localhost"
                ? ""
                : `--host ${config.get<string>("host")}`;
            const portOption = `-p ${config.get<number>("port")}`;
            const startCommand = config.get<string>("startCommand");

            const options = [httpsOption, hostOption, portOption, "--no-open"]
              .filter(Boolean)
              .join(" ");

            const command = startCommand || `npx storybook dev ${options}`;

            const newTerminal = vscode.window.createTerminal({
              name: "Run Storybook",
            });
            newTerminal.show();
            newTerminal.sendText(command, true);

            if (storyUrl) {
              await waitForRunning(storyUrl);
            }
          });
      }

      vscode.env.openExternal(vscode.Uri.parse(storyUrl));
    }),
    {
      dispose() {
        for (const [_, watcher] of storybookConfigWatchers) {
          watcher.dispose();
        }
      },
    },
  );
}

export function deactivate() {
  //
}
