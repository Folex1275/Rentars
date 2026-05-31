import { type Request, type Response, type NextFunction } from 'express';

/**
 * Lightweight request logging middleware.
 * Logs HTTP method, path, status code, and response time.
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const { method, path } = req;

  // Capture the original res.json to log after response is sent
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    console.log(
      `[${new Date().toISOString()}] ${method} ${path} - ${statusCode} (${duration}ms)`
    );
    return originalJson(body);
  };

  next();
}
