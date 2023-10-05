import * as vscode from "vscode";

export const getConfig = () => {
  const workspaceFolder =
    vscode.window.activeTextEditor === undefined
      ? undefined
      : vscode.workspace.getWorkspaceFolder(
          vscode.window.activeTextEditor.document.uri,
        );

  const storybookOptionConfiguration = vscode.workspace.getConfiguration(
    "storybook-opener.storybookOption",
    workspaceFolder,
  );

  const storybookOption = {
    configDir: storybookOptionConfiguration.get<string>("configDir")!,
    port: storybookOptionConfiguration.get<number>("port")!,
    host: storybookOptionConfiguration.get<string>("host")!,
    https: storybookOptionConfiguration.get<boolean>("https")!,
  };

  const openInEditorConfiguration = vscode.workspace.getConfiguration(
    "storybook-opener.openInEditor",
    workspaceFolder,
  );

  const openInEditor = {
    enable: openInEditorConfiguration.get<boolean>("enable")!,
    follow: openInEditorConfiguration.get<boolean>("follow")!,
  };

  const startCommand = vscode.workspace
    .getConfiguration("storybook-opener", workspaceFolder)
    .get<string>("startCommand");

  const doNotAskToAutoStart = vscode.workspace
    .getConfiguration("storybook-opener", workspaceFolder)
    .get<boolean>("doNotAskToAutoStart");

  return {
    storybookOption,
    openInEditor,
    startCommand,
    doNotAskToAutoStart,
  };
};
