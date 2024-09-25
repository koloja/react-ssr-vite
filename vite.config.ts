import {defineConfig, Plugin, ViteDevServer} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import consola from 'consola';
import chalk from 'chalk';

const Logger: Plugin = {
    name: 'logger',
    transform(src, id: any) {id = id.split('/'); consola.log(`Transforming ${chalk.gray(`${id.slice(0, -1).join('/')}/`)}${chalk.cyan(chalk.bold(id[id.length - 1]))}`); return null;},
    configureServer(server: ViteDevServer) {
        server.config.logger.info = (text) => consola.log(text.replace('hmr', 'HMR').replace('server restart', 'Server restart').replace('page reload', 'Page reload'));
        server.config.logger.error = (text) => consola.error(text);
        server.config.logger.warn = (text) => consola.warn(text);
    }
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), Logger],
    resolve: {alias: {'@': path.resolve(__dirname, 'src/client')}}
});