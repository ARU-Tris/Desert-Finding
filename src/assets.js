export const ASSET_NAMES = [
  "player_day",
  "player_night",
  "sand_tiles",
  "sand_details",
  "footprints",
  "compass_base",
  "compass_needle",
  "compass_glass",
  "player_shadow",
];
export async function loadAssets() {
  return Object.fromEntries(
    await Promise.all(
      ASSET_NAMES.map(
        (name) =>
          new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve([name, img]);
            img.onerror = () =>
              reject(
                new Error(
                  `Could not load assets/${name}.png. Check the connection and reload.`,
                ),
              );
            img.src = new URL(`../assets/${name}.png`, import.meta.url).href;
          }),
      ),
    ),
  );
}
