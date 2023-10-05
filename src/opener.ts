import * as vscode from "vscode";

import { getConfig } from "./config";
import { isRunning, waitForRunning } from "./server-checking";

const shouldRunStorybook = async (): Promise<boolean> => {
  const config = getConfig();

  if (config.autoStartBehavior === "always") {
    return true;
  }

  if (config.autoStartBehavior === "never") {
    return false;
  }

  const answer = await vscode.window.showInformationMessage(
    [
      "Storybook seems not running.",
      "Would you like to start Storybook?",
      "You can change this setting in the user settings.",
    ].join("\n"),
    "Yes",
    "Yes, and don't ask again",
    "No",
  );

  if (answer === "No") {
    return false;
  }

  if (answer === "Yes, and don't ask again") {
    await vscode.workspace
      .getConfiguration("storybook-opener")
      .update("autoStartBehavior", "always", true);

    await vscode.window.showInformationMessage(
      [
        "OK, I won't ask you again.",
        'The setting `storybook-opener.autoStartBehavior` is now set to `"always"` globally.',
        "You can change this setting in the user settings.",
      ].join("\n"),
    );
  }

  return true;
};

const startStorybook = () => {
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
};

export const openStory = async (storyUrl: string) => {
  const storybookStarted = await isRunning(storyUrl);

  if (!storybookStarted) {
    if (!(await shouldRunStorybook())) {
      return;
    }

    startStorybook();

    if (storyUrl) {
      await waitForRunning(storyUrl);
    }
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
