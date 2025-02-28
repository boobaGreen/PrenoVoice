import { Router, Request, Response } from 'express';
import MenuItem from '../models/MenuItem.js';
import authMiddleware, { AuthRequest } from '../middlewares/authMiddleware.js';

const router = Router();

// GET: Ottenere le voci del menu (protetto e filtrato per tenant)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Filtra gli elementi in base all'ID dell'utente autenticato
    const menu = await MenuItem.find({ storeId: req.user.id });
    res.json(menu);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Aggiungere una nuova voce al menu (protetta)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Validazione dei campi obbligatori
    const { name, price } = req.body;
    if (!name || !price) {
      res.status(400).json({ error: 'Nome e prezzo sono obbligatori' });
      return;
    }

    // Imposta il campo storeId con l'id dell'utente autenticato
    const newItemData = {
      ...req.body,
      storeId: req.user.id
    };
    const newItem = new MenuItem(newItemData);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT: Aggiornare un elemento del menu esistente
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Verifica che l'elemento appartenga all'utente corrente
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      storeId: req.user.id
    });

    if (!menuItem) {
      res.status(404).json({ error: 'Elemento non trovato' });
      return;
    }

    // Aggiorna l'elemento
    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true } // Restituisce il documento aggiornato
    );

    res.json(updatedItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Eliminare un elemento del menu
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      storeId: req.user.id
    });

    if (!result) {
      res.status(404).json({ error: 'Elemento non trovato' });
      return;
    }

    res.json({ message: 'Elemento eliminato con successo' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;