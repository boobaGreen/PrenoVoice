import { Router, Request, Response } from 'express';
import Order from '../models/Order.js';
import authMiddleware, { AuthRequest } from '../middlewares/authMiddleware.js';
import { OrderStatus, CancellationReason } from '../constants/orderEnums.js';

const router = Router();

// GET: Ottenere tutti gli ordini (filtrati per tenant)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ storeId: req.user.id });
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET: Ottenere un ordine specifico
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ _id: req.params.id, storeId: req.user.id });
    if (!order) {
      res.status(404).json({ error: 'Ordine non trovato' });
      return;
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST: Creare un nuovo ordine
router.post('/', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Validazione dei dati
    const { items, totalPrice, slot, customerInfo } = req.body;

    // Controllo campi obbligatori
    if (!items || !Array.isArray(items) || items.length === 0 || !totalPrice || !slot || !customerInfo) {
      res.status(400).json({ error: 'Dati mancanti o invalidi' });
      return;
    }

    // Validazione info cliente
    if (!customerInfo.name) {
      res.status(400).json({ error: 'Nome cliente obbligatorio' });
      return;
    }

    // Validazione items
    for (const item of items) {
      if (!item.menuItem || !item.quantity || item.quantity < 1) {
        res.status(400).json({ error: 'Elementi dell\'ordine non validi' });
        return;
      }
    }

    // Imposta il campo storeId con l'id dell'utente autenticato
    const orderData = {
      ...req.body,
      storeId: req.user.id
    };
    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH: Aggiornare lo stato di un ordine
router.patch('/:id/status', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, cancellationReason, cancellationNotes } = req.body;

    // Validazione dello stato
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      res.status(400).json({ error: 'Stato non valido' });
      return;
    }

    const order = await Order.findOne({ _id: req.params.id, storeId: req.user.id });
    if (!order) {
      res.status(404).json({ error: 'Ordine non trovato' });
      return;
    }

    order.status = status;

    // Se lo stato è CANCELLED, richiedi il motivo della cancellazione
    if (status === OrderStatus.CANCELLED) {
      if (!cancellationReason) {
        res.status(400).json({ error: 'Il motivo della cancellazione è obbligatorio' });
        return;
      }
      order.cancellationReason = cancellationReason;
      if (cancellationNotes) {
        order.cancellationNotes = cancellationNotes;
      }
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE: Eliminare un ordine
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await Order.findOneAndDelete({ _id: req.params.id, storeId: req.user.id });
    if (!result) {
      res.status(404).json({ error: 'Ordine non trovato' });
      return;
    }
    res.json({ message: 'Ordine eliminato con successo' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;