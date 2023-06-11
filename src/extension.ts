import * as vscode from "vscode";
import { loadStoryEntries } from "./loadStoryEntries";
import { loadStoryIndexers } from "./loadStoryIndexers";
import { loadCurrentCsf } from "./loadCurrentCsf";

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  // TODO: update stuff when workspace updated
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
  console.log("storybook-opener: READY!!");

  const { toId } = require("@storybook/csf") as typeof import("@storybook/csf");

  let disposable = vscode.commands.registerCommand(
    "storybook-opener.open",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (editor === undefined) {
        // TODO: notify to user
        return;
      }

      const absolutePath = editor.document.uri.fsPath;

      // TODO: notify if opened file is not valid CSF
      const csf = await loadCurrentCsf(
        workingDir,
        absolutePath,
        entries,
        storyIndexers
      );

      if (csf.meta.title === undefined) {
        // TODO: notify to user
        return;
      }

      // TODO: open story which cursor active
      // TODO: get port number by config
      vscode.env.openExternal(
        vscode.Uri.parse(
          `http://localhost:6006/?path=/story/${toId(csf.meta.title)}`
        )
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
