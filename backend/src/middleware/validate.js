import { ZodError } from 'zod';

/**
 * validate(schema, source = "body")
 * - Parses req[source] with Zod
 * - On success: attaches parsed value to req.validated[source]
 * - On failure: 400 with details
 */
export const validate =
    (schema, source = 'body') =>
    (req, res, next) => {
        try {
            const data =
                source === 'query' ? req.query : source === 'params' ? req.params : req.body;

            const parsed = schema.parse(data); // throws ZodError on failure
            req.validated = req.validated || {};
            req.validated[source] = parsed;
            return next();
        } catch (err) {
            if (err instanceof ZodError) {
                return res.status(400).json({
                    error: 'Invalid payload',
                    details: err.flatten(),
                });
            }
            return next(err);
        }
    };
