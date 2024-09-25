import fs from 'node:fs/promises';
import express, {Request, Response, NextFunction} from 'express';
import {Transform} from 'node:stream';
import {StatusCodes} from 'http-status-codes';
import consola from 'consola';
import chalk from 'chalk';
import pkg from './package.json';
import router from './src/lib/router';

// constants
const constants = {
    production: process.env.NODE_ENV === 'production',
    port: process.env.PORT || 2121,
    base: process.env.BASE || '/',
    ABORT_DELAY: 10000,
    UNIX: Date.now()
};

// cached production assests
const templateHtml: string = constants.production
    ? await fs.readFile('./dist/client/index.html', 'utf-8')
    : '';
const ssrManifest: string | undefined = constants.production
    ? await fs.readFile('./dist/client/.vite/ssr-manifest.json', 'utf-8')
    : undefined;

// express options
const app = express();
app.set('json spaces', 4);
app.use(express.json());
app.use(express.urlencoded({extended: true}));

(async () => {
    // middleware
    let vite: any;
    app.use((req: Request, res: Response, next: NextFunction) => {
        const agent = req.headers['user-agent'] || '';
        const outdated = /MSIE|Trident/.test(agent) || (
            agent.indexOf('Chrome') === -1 && 
            agent.indexOf('Safari') !== -1 && 
            agent.indexOf('Edge') === -1
        );
        if (outdated) return res.status(StatusCodes.BAD_REQUEST).json({
            message: 'outdated_browser',
            code: res.statusCode
        });
        next();
    });
    const rnum = await router(app);

    if (!constants.production) {
        const {createServer} = await import('vite');
        vite = await createServer({
            server: {middlewareMode: true},
            appType: 'custom',
            base: constants.base,
        });
        app.use(vite.middlewares);
    } else {
        const compression = (await import('compression')).default;
        const sirv = (await import('sirv')).default;
        app.use(compression());
        app.use(constants.base, sirv('./dist/client', {extensions: []}));
    }

    app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        if (error) {
            if (error instanceof Error) consola.error(error.stack);
            else consola.error(`We ${chalk.cyan('could not')} find a ${chalk.cyan('stack trace to show you')}.`);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: 'internal_error',
                code: res.statusCode
            });
        } 
        next();
    });

    // serve html
    app.use('*', async (req: Request, res: Response) => {
        try {
            const url: string = req.originalUrl.replace(constants.base, '');
            let template: string;
            let render: (url: string, manifest?: any, options?: any) => {pipe: (stream: Transform) => void; abort: () => void};
            
            if (!constants.production) {
                // fresh template for development
                template = await fs.readFile('./index.html', 'utf-8');
                template = await vite.transformIndexHtml(url, template);
                render = (await vite.ssrLoadModule('/src/entry-server.tsx')).render;
            } else {
                template = templateHtml;
                render = (await import('./dist/server/entry-server.js'!)).render;
            }

            let didError: boolean = false;
            const {pipe, abort} = render(url, ssrManifest, {
                onShellError() {
                    res.status(StatusCodes.INTERNAL_SERVER_ERROR)
                    // .set({'Content-Type': 'text/html'})
                    .json({
                        message: 'interal_error',
                        code: res.statusCode
                    });
                },
                onShellReady() {
                    res.status(didError ? StatusCodes.INTERNAL_SERVER_ERROR : StatusCodes.OK);
                    res.set({'Content-Type': 'text/html'});

                    const transformStream = new Transform({
                        transform(chunk, encoding, callback) {
                            res.write(chunk, encoding);
                            callback();
                        }
                    });

                    const [startHTML, endHTML] = template.split(`<!--app-html-->`);
                    res.write(startHTML);
                    transformStream.on('finish', () => res.end(endHTML));
                    pipe(transformStream);
                },
                onError(error: any) {
                    didError = true;
                    console.error(error);
                }
            });
            setTimeout(() => abort(), constants.ABORT_DELAY);
        } catch (error) {
            vite?.ssrFixStacktrace(error);
            consola.error(error.stack);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).end(error.stack);
        }
    });

    app.listen(constants.port, () => {
        console.clear();
        console.log(`\n   ${chalk.magenta(chalk.bold(pkg.name.toUpperCase()))} ${chalk.dim(`v${pkg.version}, ${Date.now() - constants.UNIX}ms`)}\n`);
        console.log(`   ${chalk.magenta(chalk.bold('>'))} ${chalk.white('Location:')}    ${chalk.cyan(`http://localhost:${chalk.bold(constants.port.toString())}/`)}`);
        console.log(`   ${chalk.magenta(chalk.bold('>'))} ${chalk.white('Routes:')}      ${chalk.hex('#cccccc')(rnum.toString())} ${chalk.dim(`(excluding frontend)`)}`);
        console.log(`   ${chalk.magenta(chalk.bold('>'))} ${chalk.white('Production:')}  ${chalk.bold((constants.production) ? chalk.green('TRUE'): chalk.red('FALSE'))}\n`);
    });
})();