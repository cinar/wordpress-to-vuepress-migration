import fs from "node:fs/promises";
import path from "node:path";
import * as ac from "ansi-colors";

/**
 * Number with trailing zeros.
 *
 * @param zeros zeros count.
 * @param value number value.
 * @returns trailing zeros.
 */
export function withTrailingZeros(zeros: number, value: number): string {
  return ("0".repeat(zeros) + value).slice(-zeros);
}

/**
 * To date only format.
 *
 * @param value date value.
 * @returns date only.
 */
export function toDateOnly(value: Date): string {
  return [
    value.getFullYear().toString(),
    withTrailingZeros(2, value.getMonth() + 1),
    withTrailingZeros(2, value.getDate()),
  ].join("-");
}

/**
 * Converts value to slug.
 *
 * @param value slug value.
 */
export function toSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z ]+/g, "")
    .replace(/ /g, "-");
}

/**
 * Zips the given arrays.
 *
 * @param a a array.
 * @param b b array.
 * @returns zip array.
 */
export function zip<T>(a: T[], b: T[]): T[][] {
  return a.map((v, i) => [v, b[i]]);
}

/**
 * Copy files from source to target.
 *
 * @param source source assets.
 * @param target target assets.
 */
export async function copyFiles(
  source: string[],
  target: string[]
): Promise<void> {
  if (source.length != target.length) {
    throw new Error(`Not the same size: ${source} != ${target}`);
  }

  for (const files of zip(source, target)) {
    const directory = path.dirname(files[1]);
    await fs.mkdir(directory, { recursive: true });

    const filename = path.basename(files[0]);
    console.log(ac.gray(`${ac.symbols.minus} Copying ${filename}.`));
    await fs.copyFile(files[0], files[1]);
  }
}
