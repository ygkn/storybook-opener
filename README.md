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
