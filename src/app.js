import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routesV1 from './routes/index.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Mount versioned routes
app.use('/v1', routesV1);

// 404 + error handlers
app.use(notFound);
app.use(errorHandler);

export default app;
