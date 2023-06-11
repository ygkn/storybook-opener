import * as vscode from "vscode";
export const requireFromWorkSpace = function (id: string) {
  const workspaceUri = vscode.workspace.workspaceFolders?.[0]?.uri;

  if (!workspaceUri) {
    throw new Error("no workspace opened");
  }

  return require(require.resolve(id, { paths: [workspaceUri.fsPath] }));
};
