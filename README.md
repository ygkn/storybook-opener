# Storybook Opener

A Visual Studio Code extension for effortless story opening

1. Open folder containing Storybook configuration as root (`/.storybook` folder)
2. Open component story format file in editor(`*.stories.{t,j}sx`, `*.mdx` etc. It depens your storybook config)
3. **You can acesss storybook story in browser quickly!**
   - Click [editor actions](https://code.visualstudio.com/api/ux-guidelines/editor-actions) button (you might see it in the editor toolbar)
   - Click `Open Story` from editor context (right-click) menu
   - Run `Storybook Opener: Open Story` from command palette

## Features

- [x] Respects your Storybook configuration (in `.storybook` folder)
- [x] Respects your Story (titles, etc)

> **Note**
> This extension **does not** launch stroybook.
>
> Please run storybook before open stories.
