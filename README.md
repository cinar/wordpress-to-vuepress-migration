[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

# WordPress to VuePress 2 Migration Script

This is a script that I put together in order to migrate a blog from WordPress 4.4.2 to [VuePress 2](https://v2.vuepress.vuejs.org/). I would expect it to work with the other versions of WordPress as well, but please add a comment below and let me know.

_This is not a general purpose migration tool from WordPress to VuePress. It only covers what I needed for my own individual use case. There may be better alternatives out there._

## Installation

You can install it by doing the following:

```bash
$ git clone https://github.com/cinar/wordpress-to-vuepress-migration.git
$ cd wordpress-to-vuepress-migration
$ npm install
```

## Usage

You can start it by doign the following:

```bash
$ npm run migration
```

The tool will ask you about your WordPress and VuePress installations. Please make sure to have your WordPress database information available. You can find it under the `wp-config.php` file.

### WordPress Parameters

| Question          | Default | Description                        |
| ----------------- | ------- | ---------------------------------- |
| Database host     |         | WordPress MySQL database host.     |
| Database name     |         | WordPress MySQL database name.     |
| Database user     |         | WordPress MySQL database user.     |
| Database password |         | WordPress MySQL database password. |
| Base directory    |         | WordPress directory.               |

### VuePress Parameters

| Question         | Default | Description              |
| ---------------- | ------- | ------------------------ |
| Base directory   |         | VuePress directory.      |
| Posts directory  | posts   | Where to put the posts.  |
| Assets directory | assets  | Where to put the images. |

Once the information is provided, the migration will run:

```bash
$ npm run migration

> wordpress-to-vuepress-migration@1.0.0 migration
> ts-node src/index.ts

▸ Please answer a few questions about your WordPress installation.
✔ Database host · 172.17.0.3
✔ Database name · wp
✔ User · wp
✔ Password · ****
✔ Base directory · /tmp/wp
▸ Connecting to WordPress database.
▸ Please answer a few questions about your VuePress installation.
✔ Base directory · /tmp/blog/docs
✔ Posts directory · posts
✔ Assets directory (under .vuepress/public) · assets
▸ Post: /tmp/blog/docs/posts/2008/12/25/sonuclar/index.md
▸ Post: /tmp/blog/docs/posts/2008/12/26/pratik-mant/index.md
－ Copying manti-1.jpg.
－ Copying manti-2.jpg.
▸ Post: /tmp/blog/docs/posts/2008/12/29/pratik-kasarl-kofte/index.md
－ Copying kofte1.jpg.
－ Copying kofte2.jpg.
```

## Pulling the posts from WordPress

Everything pretty much comes down to this SQL query. The script uses that to extract all needed pieces, then translates the content to Markdown, as well as copying the image files to Vuepress public folder.

```sql
SELECT
  u.display_name AS author,
  p.post_date AS posted,
  p.post_content AS content,
  p.post_title AS title,
  p.post_excerpt AS excerpt,
  GROUP_CONCAT(ttc.name) AS cateogies,
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
```

## License

Copyright (c) 2023 Onur Cinar. All Rights Reserved.

The source code is provided under MIT License.
