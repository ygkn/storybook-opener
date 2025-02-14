import * as vscode from "vscode";

import { getConfig } from "./config";
import { followStory, openStory } from "./opener";
import { StorybookProject } from "./storybook";

const workspaces = new Map<
	string,
	| {
			type: "failed";
			storybookProjectConfigWatcher: vscode.FileSystemWatcher;
	  }
	| {
			type: "loaded";
			storybookProject: StorybookProject;
			storybookProjectConfigWatcher: vscode.FileSystemWatcher;
			storiesWatchers: vscode.FileSystemWatcher[];
	  }
>();

let activeEditorStoryUrl: string | null = null;

const loadWorkspace = async (workspaceFolder: vscode.WorkspaceFolder) => {
	const workingDir = workspaceFolder.uri.fsPath;

	const config = getConfig();

	const existingWorkspace = workspaces.get(workingDir);

	if (existingWorkspace !== undefined) {
		existingWorkspace.storybookProjectConfigWatcher.dispose();

		if (existingWorkspace.type === "loaded") {
			for (const watcher of existingWorkspace.storiesWatchers) {
				watcher.dispose();
			}
		}

		workspaces.delete(workingDir);
	}

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
		const { storybookProject, storiesGlob } = await StorybookProject.load(
			{
				configDir,
				workingDir,
			},
			() => getConfig().storybookOption,
		);

		const storiesWatchers = storiesGlob.map((storyGlob) =>
			vscode.workspace.createFileSystemWatcher(storyGlob),
		);

		for (const watcher of storiesWatchers) {
			watcher.onDidCreate((uri) =>
				storybookProject.invalidate(uri.fsPath, false),
			);
			watcher.onDidChange((uri) =>
				storybookProject.invalidate(uri.fsPath, false),
			);
			watcher.onDidDelete((uri) =>
				storybookProject.invalidate(uri.fsPath, true),
			);
		}

		workspaces.set(workingDir, {
			type: "loaded",
			storybookProject,
			storybookProjectConfigWatcher,
			storiesWatchers,
		});
		console.log("[storybook-opener] Loaded workspace", workingDir);
	} catch (e) {
		workspaces.set(workingDir, {
			type: "failed",
			storybookProjectConfigWatcher,
		});
		console.error("[storybook-opener] Failed to load workspace", e);
	}
};

const getStoryUrlFromEditor = (
	editor: vscode.TextEditor | undefined,
): string | null => {
	if (editor === undefined) {
		return null;
	}

	const workspace = vscode.workspace.getWorkspaceFolder(editor.document.uri);

	if (workspace === undefined) {
		return null;
	}

	const workspaceHit = workspaces.get(workspace.uri.fsPath);

	if (workspaceHit === undefined || workspaceHit.type === "failed") {
		return null;
	}

	return (
		workspaceHit.storybookProject.getStorybookUrl(editor.document.uri.fsPath) ??
		null
	);
};

const onCurrentEditorChanged = (editor: vscode.TextEditor | undefined) => {
	activeEditorStoryUrl = getStoryUrlFromEditor(editor);
	console.log("[storybook-opener] Active editor changed", activeEditorStoryUrl);

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

	if (workspaces.get(workspace.uri.fsPath) === undefined) {
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
		vscode.workspace.workspaceFolders.length === 0
	) {
		return;
	}

	await Promise.all(
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
					onCurrentEditorChanged(vscode.window.activeTextEditor);
				}
			}
		}),
		vscode.window.onDidChangeActiveTextEditor(onCurrentEditorChanged),
		vscode.commands.registerCommand("storybook-opener.open", async () => {
			console.log("[storybook-opener] open", activeEditorStoryUrl);
			if (activeEditorStoryUrl === null) {
				await showWhyCannotOpenStory();

				return;
			}

			await openStory(activeEditorStoryUrl);
		}),
		{
			dispose() {
				for (const [_, workspace] of workspaces) {
					if (workspace.type === "loaded") {
						workspace.storybookProjectConfigWatcher.dispose();

						for (const watcher of workspace.storiesWatchers) {
							watcher.dispose();
						}
					}

					workspace.storybookProjectConfigWatcher.dispose();
				}
			},
		},
	);

	console.log("[storybook-opener] activated!");
}

export function deactivate() {
	console.log("[storybook-opener] deactivate");
	//
}
