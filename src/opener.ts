import * as vscode from "vscode";

type OpenerConfig = {
  openInEditor: boolean
  execFollow: boolean
}
export const getOpenerConfig = (
  activeEditor: vscode.TextEditor | null
): OpenerConfig => {
  const openInEditor = vscode.workspace.getConfiguration(
    "storybook-opener.openInEditor",
    activeEditor &&
      vscode.workspace.getWorkspaceFolder(activeEditor.document.uri),
  );
  const enable = openInEditor.get<boolean>("enable") ?? false;
  const follow = openInEditor.get<boolean>("follow") ?? false;
  return {
    openInEditor: enable,
    execFollow: enable && follow,
  }
}

export const openStory = (
  storyUrl: string,
  {
    openInEditor
  }: {
    openInEditor: boolean
  }
) => {
  if (openInEditor) {
    vscode.commands.executeCommand("simpleBrowser.api.open", storyUrl, {
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Two,
    });
  } else {
    vscode.env.openExternal(vscode.Uri.parse(storyUrl));
  }
}

export const followStory = (storyUrl: string) => {
  vscode.commands.executeCommand("simpleBrowser.api.open", storyUrl, {
    preserveFocus: true,
    viewColumn: vscode.ViewColumn.Two,
  });
}
