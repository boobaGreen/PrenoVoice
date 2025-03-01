// Modifica server.ts per usare il file db.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Importa la connessione al database
import './config/db.js';
// Importa le rotte
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import callRoutes from './routes/callRoutes.js';

dotenv.config();
console.log('OPENAI_API_KEY presente?', !!process.env.OPENAI_API_KEY);
console.log('Primi 10 caratteri della chiave:', process.env.OPENAI_API_KEY?.substring(0, 10));

// Inizializza express
const app = express();
export const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Importante per i dati di Twilio

// Configura le rotte
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/calls', callRoutes);

// Avvia il server
export const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
  });
};

// Esporta l'app per i test
export { app };

// Avvia il server se non è in modalità test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}