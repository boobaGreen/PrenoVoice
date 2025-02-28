import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Estende Request per aggiungere il campo "user"
export interface AuthRequest extends Request {
    user?: any;
}

const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        res.status(401).json({ error: 'Token mancante' });
        return;
    }

    // Si assume il formato "Bearer <token>"
    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ error: 'Token non fornito' });
        return;
    }

    try {
        const secret = process.env.JWT_SECRET || 'secretKey'; // Imposta JWT_SECRET nel tuo .env
        const decoded = jwt.verify(token, secret);
        req.user = decoded; // decoded dovrebbe contenere almeno l'id utente, es. { id: '...' }
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token non valido' });
        return;
    }
};

export default authMiddleware;