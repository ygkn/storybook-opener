<div align="center">
   <h1>
      <img src="./assets/icon.png" width="32" height="32" alt="" />
      Storybook Opener
   </h1>
   <p>A Visual Studio Code extension for effortless storybook opening</p>
</div>

## Features

- Quickly open Storybook URL from your stories files (`*.stories.{t,j}sx`) and docs files (`*.mdx`) in your browser
- Support colocating files (you can open `SomeComponent` story from `SomeComponent.tsx` or `SomeComponent.module.css`)
- Run the Storybook server when it is not started
- Smartly follow your project settings

## Usage

1. Open folder containing Storybook configuration as root (`/.storybook` folder)
2. Open component story or related file in editor(`*.stories.{t,j}sx`, `*.mdx`, `*.test.ts`, `*.module.css` etc)
3. **You can acesss storybook story in browser quickly!**
   - Click [editor actions](https://code.visualstudio.com/api/ux-guidelines/editor-actions) button (you might see it in the editor toolbar)
   - Click `Open Storybook` from editor context (right-click) menu
   - Run `Storybook Opener: Open Storybook` from command palette

## Settings

### Storybook Option

Usually Storybook options are different for each project, so it is recommended to save them as workspace settings.

```jsonc
{
  /**
   * Options to get Storybook URL
   */

  // Directory where to load Storybook configurations from
  // Same to `-c` / `--config-dir` option of Storybook CLI Options
  "storybook-opener.storybookOption.configDir": ".storybook",

  // Host to run Storybook
  // Same to `-h` / `--host` option of Storybook CLI Options
  "storybook-opener.storybookOption.host": "localhost",

  // Serve Storybook over HTTPS
  // Same to `--https` option of Storybook CLI Options
  "storybook-opener.storybookOption.https": false,

  // Port to run Storybook
  // Same to `-p` / `--port` option of Storybook CLI Options
  "storybook-opener.storybookOption.port": 6006,

  /**
   * Options to run Storybook
   */

  // Command to run when starting a Storybook.
  // By default, Storybook Opener detects the package manager you are using and executes the `storybook` task with it.
  "storybook-opener.storybookOption.startCommand": ""
}
```
