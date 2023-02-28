import { createWordPressClient } from "./wordpress";
import { createVuePressClient } from "./vuepress";
import { copyFiles } from "./helper";
import * as dotenv from "dotenv";

/**
 * Main function.
 */
async function main(): Promise<void> {
  dotenv.config();

  const wp = await createWordPressClient();
  try {
    const vp = await createVuePressClient();

    for (const wpPost of await wp.posts()) {
      const vpPost = vp.convertFromWordPress(wpPost);
      await vp.add(vpPost);

      await copyFiles(wp.getPostAssets(wpPost), vp.getPostAssets(vpPost));
    }
  } finally {
    await wp.disconnect();
  }
}

(async () => {
  await main();
})();
