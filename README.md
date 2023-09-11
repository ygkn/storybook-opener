<div align="center">
  <h1>
    <img src="./assets/icon.png" width="32" height="32" alt="" />
    Storybook Opener
  </h1>
  <p>A Visual Studio Code extension to open Storybook quickly</p>
  <p>
    <img
      alt="Visual Studio Marketplace Version"
      src="https://img.shields.io/visual-studio-marketplace/v/ygkn.storybook-opener?style=flat-square&logo=visualstudiocode"
    />
    <img
      alt="Visual Studio Marketplace Installs"
      src="https://img.shields.io/visual-studio-marketplace/i/ygkn.storybook-opener?style=flat-square&logo=visualstudiocode"
    />
    <img
      alt="Visual Studio Marketplace Last Updated"
      src="https://img.shields.io/visual-studio-marketplace/last-updated/ygkn.storybook-opener?style=flat-square&logo=visualstudiocode"
    />
  </p>
  <video
    src="https://github.com/ygkn/storybook-opener/assets/14973783/fe28989d-dd70-4b0c-9964-0ff6c8710dd1"
  >
    <img
      src="https://github.com/ygkn/storybook-opener/assets/14973783/09c2eb33-7922-4b43-9337-a9a96e465334"
      alt="demo video"
    />
  </video>
</div>

## Features

- **Efficiency**: Open Storybook directly from your active file.
- **Colocation Support**: Instantly open `SomeComponent` story from associated files like `SomeComponent.tsx` or `SomeComponent.module.css`.
- **Auto Server Start**: If your Storybook server isn't running, it'll initiate it for you.
- **Adaptable**: Seamlessly syncs with your project settings.

## Usage

1. Open folder containing Storybook configuration as root (`/.storybook` folder)
2. Open component story or related file in editor(`*.stories.{t,j}sx`, `*.mdx`, `*.test.ts`, `*.module.css` etc)
3. **You can acesss storybook story in browser quickly!**
   - Click [editor actions](https://code.visualstudio.com/api/ux-guidelines/editor-actions) button (you might see it in the editor toolbar)
   - Click `Open Storybook` from editor context (right-click) menu
   - Run `Storybook Opener: Open Storybook` from command palette

## Guide

### Running the Storybook dev server and other commands

If you need to execute other commands, such as code generation, to launch the Storybook dev server, you can use the [`npm-run-all`](https://github.com/mysticatea/npm-run-all) or [`concurrently`](https://github.com/open-cli-tools/concurrently) packages in conjunction with the `storybook-opener.storybookOption.startCommand` option.

For example, think about a project requires running the `watch` script alongside the `storybook dev` command, and it have a `package.json` set up with `scripts` as follows:

```json
{
  "scripts": {
    "storybook": "run-p watch 'storybook:dev -- {1}' --",
    "storybook:dev": "storybook dev -p 6006",
    "watch": ": Commands necessary for the Storybook dev server..."
  }
}
```

`-- {1}` is [argument placeholder](https://github.com/mysticatea/npm-run-all/blob/master/docs/run-p.md#argument-placeholders) of `npm-run-all` package.

Additionally, configure the `storybook-opener.storybookOption.startCommand` option like this:

```json
{
  "storybook-opener.storybookOption.startCommand": "npm run storybook -- --no-open"
}
```

Then, when you run the `npm run storybook` command, it will execute the Storybook dev server concurrently with the `watch` command. Moreover, when you launch the Storybook dev server from the Storybook Opener, the `watch` command will execute, and the `storybook dev` command will have the `--no-open` option appended.

### Working with monorepo

If you're using Storybook Opener in a monorepo project, try the methods described below.

#### Using [Multi-root Workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces) (Recommended)

VS Code's [Multi-root Workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces) feature allows you to open multiple folders simultaneously. This is particularly handy when working with a monorepo project in VS Code. (For your information: [Visual Studio Code tips for monorepo development with Multi-root Workspaces and extension | by Damian Cyrus | REWRITE TECH by diconium | Medium](https://medium.com/rewrite-tech/visual-studio-code-tips-for-monorepo-development-with-multi-root-workspaces-and-extension-6b69420ecd12))

For instance, imagine you have a monorepo project with the following folder structure:

```
.
├── apps
│   ├── web
│   ├── docs
│   └── ...
└── packages
     ├── ui
     └── ...
```

In this case, you'd configure Multi-root Workspaces as follows:

**`.vscode/project.code-workspace`**

```json
{
  "folders": [
    {
      "name": "root",
      "path": ".."
    },
    {
      "path": "../apps/web"
    },
    {
      "path": "../packages/docs"
    },
    {
      "path": "../packages/ui"
    }
  ],
  "extensions": {
    "recommendations": ["ygkn.storybook-opener"]
  }
}
```

You can open `.vscode/project.code-workspace` using one of the following methods, and Storybook Opener can be used in any package:

- Select **File** > **Open Workspace from File...** and open `project.code-workspace`.
- Double-click on `project.code-workspace` in your file manager.
- Open `project.code-workspace` in the editor and click **Open Workspace** in the bottom right corner of the editor.
- Execute `code project.code-workspace` from the terminal.

Furthermore, using different port numbers for each package allows efficient checking if the Storybook server is running. Plus, you can run the Storybook server for each package concurrently.

**`apps/web/.vscode/settings.json`**

```json
{
  "storybook-opener.storybookOption.port": 6006
}
```

**`packages/docs/.vscode/settings.json`**

```json
{
  "storybook-opener.storybookOption.port": 6007
}
```

**`packages/ui/.vscode/settings.json`**

```json
{
  "storybook-opener.storybookOption.port": 6008
}
```

**Pro Tip**: You can set `"files.exclude"` in `.vscode/settings.json` of root workspace to hide other packages from the explorer.

**`.vscode/settings.json`**

```json
{
  "files.exclude": {
    "packages/": true,
    "apps/": true
  }
}
```

#### Setting `storybook-opener.storybookOption.configDir` and `storybook-opener.storybookOption.startCommand` options

If you have just one package using Storybook and you don't want to use multi-root workspaces, you can use Storybook Opener by configuring the `storybook-opener.storybookOption.configDir` and `storybook-opener.storybookOption.startCommand` options.

```json
{
  "storybook-opener.storybookOption.configDir": "apps/web/.storybook",
  "storybook-opener.storybookOption.startCommand": "npm run storybook -w apps/web -- --no-open"
}
```

## Settings

### Options to get Storybook URL

#### `storybook-opener.storybookOption.configDir`

- **Type**: `string`
- **Default**: `.storybook`

> Directory where to load Storybook configurations from

Same to `-c` / `--config-dir` option of [Storybook CLI Options](https://storybook.js.org/docs/react/api/cli-options).

#### `storybook-opener.storybookOption.port`

- **Type**: `number`
- **Default**: `6006`

> Port to run Storybook

Same to `-p` / `--port` option of [Storybook CLI Options](https://storybook.js.org/docs/react/api/cli-options).

#### `storybook-opener.storybookOption.host`

- **Type**: `string`
- **Default**: `localhost`

> Host to run Storybook

Same to `-h` / `--host` option of [Storybook CLI Options](https://storybook.js.org/docs/react/api/cli-options).

#### `storybook-opener.storybookOption.https`

- **Type**: `boolean`
- **Default**: `false`

> Serve Storybook over HTTPS

Same to `--https` option of [Storybook CLI Options](https://storybook.js.org/docs/react/api/cli-options).

### Options to run Storybook

#### `storybook-opener.storybookOption.startCommand`

- **Type**: `string`
- **Default**: `""`

Command to run when starting a Storybook.

By default, Storybook Opener detects the package manager you are using and executes the `storybook` task with it.

## Contributing

Contributions, issues and feature requests are welcome!

## Development

1. Clone this repository
2. Run `npm install`
3. Open this repository in VS Code
4. Run `Run Extension` from the Run view

## License

[MIT](LICENSE.md)
