import { prompt } from "enquirer";
import mysql from "mysql2";
import * as ac from "ansi-colors";
import path from "node:path";

/**
 * WordPress post.
 */
export interface WordPressPost extends mysql.RowDataPacket {
  author: string;
  posted: Date;
  content: string;
  title: string;
  excerpt: string;
  categories: string;
  tags: string;
}

/**
 * WordPress options.
 */
interface IOptions {
  baseDirectory: string;
}

/**
 * Prompt for the database connection options.
 *
 * @returns connection options.
 */
async function promptForConnectionOptions(): Promise<mysql.ConnectionOptions> {
  console.log(
    ac.blue(ac.symbols.pointer),
    "Please answer a few questions about your WordPress installation."
  );

  return (await prompt([
    {
      type: "input",
      message: "Database host",
      name: "host",
      required: true,
      initial: process.env.WORDPRESS_HOST,
    },
    {
      type: "input",
      message: "Database name",
      name: "database",
      required: true,
      initial: process.env.WORDPRESS_DATABASE,
    },
    {
      type: "input",
      message: "User",
      name: "user",
      required: true,
      initial: process.env.WORDPRESS_USER,
    },
    {
      type: "password",
      message: "Password",
      name: "password",
      required: true,
      initial: process.env.WORDPRESS_PASSWORD,
    },
  ])) as mysql.ConnectionOptions;
}

/**
 * Prompt for client options.
 *
 * @returns client options.
 */
async function promptForOptions(): Promise<IOptions> {
  return (await prompt([
    {
      type: "input",
      message: "Base directory",
      name: "baseDirectory",
      required: true,
      initial: process.env.WORDPRESS_BASEDIRECTORY,
    },
  ])) as IOptions;
}

/**
 * Creates a WordPress client.
 *
 * @returns wordpress client.
 */
export async function createWordPressClient(): Promise<WordPressClient> {
  const connectionOptions = await promptForConnectionOptions();
  const options = await promptForOptions();

  console.log(ac.blue(ac.symbols.pointer), "Connecting to WordPress database.");
  const connection = mysql.createConnection(connectionOptions);

  return new WordPressClient(connection, options);
}

/**
 * WordPress client.
 */
export class WordPressClient {
  /** Assets pattern. */
  private assetsPattern: RegExp;

  /**
   * Constructor.
   *
   * @param connection database connection.
   * @param options wordpress options.
   */
  constructor(private connection: mysql.Connection, private options: IOptions) {
    this.assetsPattern = /\/wp-content\/uploads\/([^" ]+)/gm;
  }

  /**
   * Disconnects client.
   */
  async disconnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      console.log(
        ac.blue(ac.symbols.pointer),
        "Disconnecting from WordPress database."
      );

      this.connection.end((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Gets the post assets.
   *
   * @param post post object.
   * @returns post assets.
   */
  getPostAssets(post: WordPressPost): string[] {
    return Array.from(post.content.matchAll(this.assetsPattern), (matches) =>
      path.join(this.options.baseDirectory, "/wp-content/uploads/", matches[1])
    );
  }

  /**
   * Gets the published posts.
   *
   * @returns published posts.
   */
  async posts(): Promise<WordPressPost[]> {
    return new Promise<WordPressPost[]>((resolve, reject) => {
      this.connection.query<WordPressPost[]>(
        `
      SELECT
        u.display_name AS author,
        p.post_date AS posted,
        p.post_content AS content,
        p.post_title AS title,
        p.post_excerpt AS excerpt,
        GROUP_CONCAT(ttc.name) AS categories,
        GROUP_CONCAT(ttt.name) AS tags
      FROM wp_posts p
      INNER JOIN wp_users u ON (u.id = p.post_author)
      LEFT JOIN wp_term_relationships tr ON (tr.object_id = p.post_parent)
      LEFT JOIN wp_term_taxonomy tt ON (tt.term_taxonomy_id = tr.term_taxonomy_id)
      LEFT JOIN wp_terms ttc ON (ttc.term_id = tt.term_id AND tt.taxonomy = "category")
      LEFT JOIN wp_terms ttt ON (ttt.term_id = tt.term_id AND tt.taxonomy = "post_tag")
      WHERE p.id IN (
        SELECT MAX(id) AS id
        FROM wp_posts
        WHERE post_parent IN (
          SELECT id
          FROM wp_posts
          WHERE post_parent = 0
            AND post_status = "publish"
        )
        GROUP BY post_parent
      )
      AND p.post_type IN ("post", "revision")
      GROUP BY
        u.display_name,
        p.post_date,
        p.post_content,
        p.post_title,
        p.post_excerpt;
      `,
        (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        }
      );
    });
  }
}
