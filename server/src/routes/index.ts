import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { directoryRouter } from './directory';
import { meRouter } from './me';
import { correctionsRouter } from './corrections';
import { eventsRouter } from './events';
import { itemsRouter } from './items';
import { helpRouter } from './help';
import { adminRouter } from './admin';
import { committeeRouter } from './committee';
import { reportsRouter } from './reports';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/me', meRouter);
apiRouter.use('/corrections', correctionsRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/help', helpRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/committee', committeeRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/', itemsRouter);
apiRouter.use('/', directoryRouter);
