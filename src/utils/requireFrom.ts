/** @public */
export const requireFrom = (id: string, dir: string) =>
	require(require.resolve(id, { paths: [dir] }));
