import { Router, Response } from 'express';
import User from '../models/User.js';
import authMiddleware, { AuthRequest } from '../middlewares/authMiddleware.js';

const router = Router();

// GET: Ottenere tutti gli utenti (solo admin dovrebbe poterlo fare in un'app reale)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Ottenere un utente specifico per ID (solo lo stesso utente o admin)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Controlla se l'utente sta accedendo ai propri dati
        if (req.user.id !== req.params.id) {
            res.status(403).json({ error: 'Non autorizzato ad accedere a questo utente' });
            return;
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            res.status(404).json({ error: 'Utente non trovato' });
            return;
        }
        res.json(user);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Creare un nuovo utente (questa può rimanere pubblica per la registrazione)
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const newUser = new User(req.body);
        // La password verrà criptata dal middleware definito nel modello
        const savedUser = await newUser.save();
        res.status(201).json(savedUser);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH: Aggiornare un utente esistente (solo lo stesso utente)
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Controlla se l'utente sta modificando se stesso
        if (req.user.id !== req.params.id) {
            res.status(403).json({ error: 'Non autorizzato a modificare questo utente' });
            return;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedUser) {
            res.status(404).json({ error: 'Utente non trovato' });
            return;
        }
        res.json(updatedUser);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Eliminare un utente (solo lo stesso utente)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Controlla se l'utente sta eliminando se stesso
        if (req.user.id !== req.params.id) {
            res.status(403).json({ error: 'Non autorizzato a eliminare questo utente' });
            return;
        }

        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) {
            res.status(404).json({ error: 'Utente non trovato' });
            return;
        }
        res.json({ message: 'Utente eliminato correttamente' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;