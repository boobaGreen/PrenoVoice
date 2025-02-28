import express, { Request, Response } from 'express';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import './config/db.js';

export const app = express();  // Esporta l'app come costante

app.use(express.json());

app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('Backend avviato correttamente!');
});

const PORT = process.env.PORT || 3005;

// Solo se non siamo in modalità test
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server in esecuzione sulla porta ${PORT}`));
}