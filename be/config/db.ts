import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Salta la connessione al database in ambiente di test
if (process.env.NODE_ENV !== 'test') {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/idea-app';

  mongoose.connect(mongoURI)
    .then(() => console.log("Connesso a MongoDB"))
    .catch((err: Error) => console.error("Errore di connessione a MongoDB:", err));
}

export default mongoose;