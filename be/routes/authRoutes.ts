import { Router, Request, Response } from 'express';
import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = Router();

// Endpoint per il login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Trova l'utente con l'email fornita
        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ error: 'Credenziali non valide' });
            return;
        }

        // Verifica la password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ error: 'Credenziali non valide' });
            return;
        }

        // Crea il token JWT
        const payload = {
            id: user._id,
            name: user.name,
            email: user.email
        };

        const secret = process.env.JWT_SECRET || 'secretKey';
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        res.json({ token });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;