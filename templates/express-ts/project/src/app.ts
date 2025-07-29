import express from 'express';
import helloRoutes from './routes/index.routes';

const app = express();

app.use(express.json());
app.use('/api/hello', helloRoutes);

export default app;