/** @public */
export const requireFrom = function (id: string, dir: string) {
  return require(require.resolve(id, { paths: [dir] }));
};
