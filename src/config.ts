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
		// biome-ignore lint/style/noNonNullAssertion: has default value in package.json
		configDir: storybookOptionConfiguration.get<string>("configDir")!,
		// biome-ignore lint/style/noNonNullAssertion: has default value in package.json
		port: storybookOptionConfiguration.get<number>("port")!,
		// biome-ignore lint/style/noNonNullAssertion: has default value in package.json
		host: storybookOptionConfiguration.get<string>("host")!,
		// biome-ignore lint/style/noNonNullAssertion: has default value in package.json
		https: storybookOptionConfiguration.get<boolean>("https")!,
	};

	const openInEditorConfiguration = vscode.workspace.getConfiguration(
		"storybook-opener.openInEditor",
		workspaceFolder,
	);

	const openInEditor = {
		// biome-ignore lint/style/noNonNullAssertion: has default value in package.json
		enable: openInEditorConfiguration.get<boolean>("enable")!,
		// biome-ignore lint/style/noNonNullAssertion: has default value in package.json
		follow: openInEditorConfiguration.get<boolean>("follow")!,
	};

	const startCommand = vscode.workspace
		.getConfiguration("storybook-opener", workspaceFolder)
		.get<string>("startCommand");

	const autoStartBehavior = vscode.workspace
		.getConfiguration("storybook-opener", workspaceFolder)
		.get<"ask" | "always" | "never">("autoStartBehavior");

	return {
		storybookOption,
		openInEditor,
		startCommand,
		autoStartBehavior,
	};
};
