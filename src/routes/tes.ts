import express, {NextFunction, Request, Response} from 'express';
import {StatusCodes} from 'http-status-codes';
const router = express.Router();

router.use('/tes', async (req: Request, res: Response, next: NextFunction) => {
    try {
        return res.status(StatusCodes.OK).json({
            message: req.baseUrl,
            data: {
                address: req.ip,
                method: req.method,
                params: req.params,
                body: req.body,
                status: req.statusCode,
                headers: req.headers,
                headersSent: res.headersSent
            },
            code: res.statusCode
        });
    } catch (error) {next(error)};
});
export default router;