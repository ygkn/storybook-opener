import type { Builder, CoreConfig, Options } from "@storybook/types";
import invariant from "tiny-invariant";

async function getManagerBuilder(configDir: string): Promise<Builder<unknown>> {
  const builderPackage = require.resolve("@storybook/builder-manager", {
    paths: [configDir],
  });
  const previewBuilder = require(builderPackage);
  return previewBuilder;
}

async function getPreviewBuilder(
  builderName: string,
  configDir: string,
): Promise<Builder<unknown>> {
  const builderPackage = require.resolve(
    ["webpack5"].includes(builderName)
      ? `@storybook/builder-${builderName}`
      : builderName,
    { paths: [configDir] },
  );
  const previewBuilder = require(builderPackage);
  return previewBuilder;
}

/**
 *  @see https://github.com/storybookjs/storybook/blob/0f6b041fbc9bd99ab6cfaa25caec8dd0177cdc5d/code/lib/core-server/src/utils/get-builders.ts
 */
export async function getBuilders({
  presets,
  configDir,
}: Options): Promise<[Builder<unknown>, Builder<unknown>]> {
  const { builder } = await presets.apply<CoreConfig>("core", {});
  invariant(builder, "no builder configured!");
  const builderName = typeof builder === "string" ? builder : builder.name;

  return Promise.all([
    getPreviewBuilder(builderName, configDir),
    getManagerBuilder(configDir),
  ]);
}
