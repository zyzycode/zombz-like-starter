export const pendingBuilds = [];
export function createLevelRuntime() {
  return new Promise((resolve, reject) => pendingBuilds.push({ resolve, reject }));
}
