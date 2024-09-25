import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import consola from 'consola';
import chalk from 'chalk';
import {fileURLToPath} from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async (app: express.Express): Promise<number> => {
    let rnum = 0;
    const rpath = path.join(__dirname, '../api');
    const files = await fs.readdir(rpath);
    for (const file of files) {
        const filePath = path.join(rpath, file);
        if ((await fs.stat(filePath)).isFile() && file.endsWith('.ts') || file.endsWith('.js')) {
            const url = new URL(`file://${filePath}`);
            try {
                const module = await import(url.href);
                if (module.default) {rnum = rnum + module.default.stack.length; app.use(module.default)};
            } catch (error) {
                if (error instanceof Error) consola.error(error.stack);
                else consola.error(`We ${chalk.cyan('could not')} find a ${chalk.cyan('stack trace to show you')}..`);
                process.kill(1);
            }
        }
    }
    return rnum;
}