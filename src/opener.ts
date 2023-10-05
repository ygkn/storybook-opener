import * as vscode from "vscode";

import { getConfig } from "./config";
import { isRunning, waitForRunning } from "./server-checking";

export const openStory = async (storyUrl: string) => {
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

        const config = getConfig();
        const httpsOption = config.storybookOption.https ? "--https" : "";
        const hostOption =
          config.storybookOption.host === "localhost" ||
          config.storybookOption.host === ""
            ? ""
            : `--host ${config.storybookOption.host}`;
        const portOption = `-p ${config.storybookOption.port}`;
        const startCommand = config.startCommand;

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

  const { openInEditor } = getConfig();

  if (openInEditor) {
    vscode.commands.executeCommand("simpleBrowser.api.open", storyUrl, {
      preserveFocus: false,
      viewColumn: vscode.ViewColumn.Two,
    });
  } else {
    vscode.env.openExternal(vscode.Uri.parse(storyUrl));
  }
};

export const followStory = async (storyUrl: string) => {
  const { openInEditor } = getConfig();

  if (!openInEditor.enable || !openInEditor.follow) {
    return;
  }

  if (!(await isRunning(storyUrl))) {
    return;
  }

  vscode.commands.executeCommand("simpleBrowser.api.open", storyUrl, {
    preserveFocus: true,
    viewColumn: vscode.ViewColumn.Two,
  });
};
