import { Router } from 'express';
import { env } from '../config/env';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'samaj-connect-server',
    env: env.NODE_ENV,
    mockOtp: env.MOCK_OTP,
    time: new Date().toISOString(),
  });
});
