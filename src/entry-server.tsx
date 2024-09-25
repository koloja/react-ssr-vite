import {StaticRouter} from 'react-router-dom/server';
import {
    type RenderToPipeableStreamOptions,
    renderToPipeableStream
} from 'react-dom/server';
import App from './App';

export const render = (
    _url: string,
    _ssrManifest?: string,
    options?: RenderToPipeableStreamOptions
) => renderToPipeableStream(<StaticRouter location={_url}><App/></StaticRouter>, options);