import { WordPressPost } from "./wordpress";
import path from "node:path";
import fs from "node:fs/promises";
import { prompt } from "enquirer";
import * as ac from "ansi-colors";
import { toDateOnly, toSlug } from "./helper";
import TurndownService from "turndown";

/**
 * WordPress post.
 */
export interface VuePressPost {
  author: string;
  posted: string;
  content: string;
  title: string;
  excerpt: string;
  categories: string[];
  tags: string[];
}

/**
 * VuePress options.
 */
interface IOptions {
  baseDirectory: string;
  postsDirectory: string;
  assetsDirectory: string;
}

/**
 * Prompt for the Vuepress options from the user.
 *
 * @returns Vuepress options.
 */
async function promptForOptions(): Promise<IOptions> {
  console.log(
    ac.blue(ac.symbols.pointer),
    "Please answer a few questions about your VuePress installation."
  );

  return (await prompt([
    {
      type: "input",
      message: "Base directory",
      name: "baseDirectory",
      required: true,
      initial: process.env.VUEPRESS_BASEDIRECTORY,
    },
    {
      type: "input",
      message: "Posts directory",
      name: "postsDirectory",
      required: true,
      initial: "posts",
    },
    {
      type: "input",
      message: "Assets directory (under .vuepress/public)",
      name: "assetsDirectory",
      required: true,
      initial: "assets",
    },
  ])) as IOptions;
}

/**
 * Creates a VuePress client.
 *
 * @returns vuepress client.
 */
export async function createVuePressClient(): Promise<VuePressClient> {
  const options = await promptForOptions();
  return new VuePressClient(options);
}

/**
 * VuePress client.
 */
export class VuePressClient {
  /** Turndown service. */
  private ts: TurndownService;

  /** Assets pattern. */
  private assetsPattern: RegExp;

  /** WordPress assets convert pattern. */
  private wpAssetsConvertPattern: RegExp;

  /**
   * Constructor.
   *
   * @param options vuepress otions.
   */
  constructor(private options: IOptions) {
    this.ts = new TurndownService();
    this.assetsPattern = new RegExp(
      "\\]\\((" +
        this.options.assetsDirectory.replace(/\\?\//g, "/") +
        "\\/([^ ]+))",
      "gm"
    );
    this.wpAssetsConvertPattern = /https?:\/\/[^ ]+\/wp-content\/uploads/gm;
  }

  /**
   * Gets the post assets.
   *
   * @param post post object.
   * @returns post assets.
   */
  getPostAssets(post: VuePressPost): string[] {
    return Array.from(post.content.matchAll(this.assetsPattern), (matches) =>
      path.join(this.options.baseDirectory, "/.vuepress/public/", matches[1])
    );
  }

  /**
   * Converts WordPress post to VuePress post.
   *
   * @param wpPost wordpress post.
   * @returns vuepress post.
   */
  convertFromWordPress(wpPost: WordPressPost): VuePressPost {
    const content = this.ts
      .turndown(wpPost.content)
      .replace(this.wpAssetsConvertPattern, this.options.assetsDirectory);

    return {
      author: wpPost.author,
      posted: toDateOnly(wpPost.posted),
      content: content,
      title: wpPost.title,
      excerpt: wpPost.excerpt,
      categories: wpPost.categories != null ? wpPost.categories.split(",") : [],
      tags: wpPost.tags != null ? wpPost.tags.split(",") : [],
    };
  }

  /**
   * Add post to VuePress.
   *
   * @param post post object.
   */
  async add(post: VuePressPost): Promise<void> {
    const postDirectory = this.getPostDirectory(post);
    await fs.mkdir(postDirectory, { recursive: true });

    const postFile = path.join(postDirectory, "index.md");
    console.log(ac.blue(ac.symbols.pointer), "Post:", postFile);
    await fs.writeFile(postFile, this.toBody(post));
  }

  /**
   * Posts directory.
   *
   * @returns posts directory.
   */
  private getPostDirectory(post: VuePressPost): string {
    return path.join(
      this.options.baseDirectory,
      this.options.postsDirectory,
      post.posted.replace(/-/g, "/"),
      toSlug(post.title)
    );
  }

  /**
   * To VuePress post body.
   *
   * @param post vuepress post.
   * @returns post body.
   */
  private toBody(post: VuePressPost): string {
    let body = "---\n";
    body += `title: ${post.title}\n`;
    body += `author: ${post.author}\n`;
    body += `date: ${post.posted}\n`;

    if (post.excerpt !== "") {
      body += `excerpt: ${post.excerpt}\n`;
    }

    if (post.categories.length > 0) {
      body += "category:\n";
      post.categories.forEach((category) => {
        body += `  - ${category}\n`;
      });
    }

    if (post.tags.length > 0) {
      body += "tag:\n";
      post.tags.forEach((tag) => {
        body += `  - ${tag}\n`;
      });
    }

    body += "---\n\n";
    body += post.content;
    body += "\n";

    return body;
  }
}
