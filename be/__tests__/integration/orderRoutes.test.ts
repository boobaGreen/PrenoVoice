import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestUser, createTestMenuItem } from '../helpers.js';
import Order from '../../models/Order.js';
import { OrderStatus } from '../../constants/orderEnums.js';
import { app } from '../../server.js'; // Assicurati che il tuo server.js esporti l'istanza di app
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';

// Importa la configurazione del database di test
import '../setup.js';

describe('Order Routes', () => {
    let token: string;
    let userId: string;
    let menuItemId: string;

    beforeEach(async () => {
        // Crea utente e token per i test
        const { user, token: authToken } = await setupTestUser();
        token = authToken;
        userId = (user._id as mongoose.Types.ObjectId).toString();

        // Crea un menu item di test
        const menuItem = await createTestMenuItem(userId) as { _id: mongoose.Types.ObjectId };
        menuItemId = menuItem._id.toString();
    });

    describe('POST /api/orders', () => {
        it('dovrebbe creare un nuovo ordine', async () => {
            const orderData = {
                items: [
                    {
                        menuItem: menuItemId,
                        quantity: 2,
                        notes: 'Test note'
                    }
                ],
                totalPrice: 21.98,
                status: OrderStatus.PENDING,
                slot: 3,
                customerInfo: {
                    name: 'Test Customer',
                    phone: '1234567890'
                },
                notes: 'Test order notes'
            };

            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(orderData);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.storeId).toBe(userId);
            expect(response.body.items.length).toBe(1);
            expect(response.body.items[0].menuItem).toBe(menuItemId);
            expect(response.body.totalPrice).toBe(21.98);
            expect(response.body.status).toBe(OrderStatus.PENDING);
        });

        it('dovrebbe rispondere con errore 401 senza token', async () => {
            const response = await request(app)
                .post('/api/orders')
                .send({});

            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/orders', () => {
        it('dovrebbe ottenere tutti gli ordini dell\'utente', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            await order.save();

            const response = await request(app)
                .get('/api/orders')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(1);
            expect(response.body[0].storeId).toBe(userId);
        });
    });

    describe('GET /api/orders/:id', () => {
        it('dovrebbe ottenere un ordine specifico', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            const response = await request(app)
                .get(`/api/orders/${savedOrder._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('_id', (savedOrder._id as mongoose.Types.ObjectId).toString());
        });

        it('dovrebbe rispondere con 404 per ID non esistente', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/orders/${fakeId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(404);
        });
    });

    describe('PATCH /api/orders/:id/status', () => {
        it('dovrebbe aggiornare lo stato di un ordine', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            const response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: OrderStatus.CONFIRMED });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', OrderStatus.CONFIRMED);
        });
    });

    describe('DELETE /api/orders/:id', () => {
        it('dovrebbe eliminare un ordine', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            const response = await request(app)
                .delete(`/api/orders/${savedOrder._id}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Ordine eliminato con successo');

            // Verifica che l'ordine sia stato effettivamente eliminato
            const deletedOrder = await Order.findById(savedOrder._id);
            expect(deletedOrder).toBeNull();
        });
    });
    // ... il tuo codice esistente ...

    // Test aggiuntivi per controlli di autenticazione su tutti gli endpoint
    describe('Controlli di autenticazione', () => {
        it('GET /api/orders dovrebbe restituire 401 senza token', async () => {
            const response = await request(app).get('/api/orders');
            expect(response.status).toBe(401);
        });

        it('GET /api/orders/:id dovrebbe restituire 401 senza token', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app).get(`/api/orders/${fakeId}`);
            expect(response.status).toBe(401);
        });

        it('PATCH /api/orders/:id/status dovrebbe restituire 401 senza token', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .patch(`/api/orders/${fakeId}/status`)
                .send({ status: OrderStatus.CONFIRMED });
            expect(response.status).toBe(401);
        });

        it('DELETE /api/orders/:id dovrebbe restituire 401 senza token', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app).delete(`/api/orders/${fakeId}`);
            expect(response.status).toBe(401);
        });
    });

    // Test per validazione dei dati
    describe('Validazione dei dati', () => {
        it('POST /api/orders dovrebbe restituire 400 con dati invalidi', async () => {
            // Dati mancanti (items, totalPrice, slot, customerInfo)
            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: OrderStatus.PENDING
                });

            expect(response.status).toBe(400);
        });

        it('POST /api/orders dovrebbe restituire 400 senza nome cliente', async () => {
            const orderData = {
                items: [
                    {
                        menuItem: menuItemId,
                        quantity: 2
                    }
                ],
                totalPrice: 21.98,
                status: OrderStatus.PENDING,
                slot: 3,
                customerInfo: {
                    // nome cliente mancante
                    phone: '1234567890'
                }
            };

            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(orderData);

            expect(response.status).toBe(400);
        });

        it('POST /api/orders dovrebbe restituire 400 con quantità negativa', async () => {
            const orderData = {
                items: [
                    {
                        menuItem: menuItemId,
                        quantity: -1  // quantità non valida
                    }
                ],
                totalPrice: 21.98,
                status: OrderStatus.PENDING,
                slot: 3,
                customerInfo: {
                    name: 'Test Customer'
                }
            };

            const response = await request(app)
                .post('/api/orders')
                .set('Authorization', `Bearer ${token}`)
                .send(orderData);

            expect(response.status).toBe(400);
        });

        it('PATCH /api/orders/:id/status dovrebbe restituire 400 con stato non valido', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            const response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'stato_non_valido' });

            expect(response.status).toBe(400);
        });

        it('PATCH /api/orders/:id/status dovrebbe richiedere motivo di cancellazione quando lo stato è CANCELLED', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            const response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: OrderStatus.CANCELLED });  // Manca il motivo di cancellazione

            expect(response.status).toBe(400);
        });
    });

    // Test per isolamento multi-tenant
    describe('Isolamento multi-tenant', () => {
        let otherUserToken: string;
        let otherUserId: string;

        beforeEach(async () => {
            // Crea un secondo utente
            const userData = {
                name: 'Test User 2',
                email: 'test2@example.com',
                password: 'password123'
            };

            const user = new User(userData);
            await user.save();

            otherUserId = (user._id as mongoose.Types.ObjectId).toString();
            otherUserToken = jwt.sign(
                { id: user._id, name: user.name, email: user.email },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );
        });

        it('non dovrebbe permettere di accedere agli ordini di un altro utente', async () => {
            // Crea un ordine per il primo utente
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            // Prova ad accedere con il secondo utente
            const response = await request(app)
                .get(`/api/orders/${savedOrder._id}`)
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(response.status).toBe(404);  // Dovrebbe essere 404 perché l'ordine "non esiste" per questo utente
        });

        it('non dovrebbe permettere di modificare gli ordini di un altro utente', async () => {
            // Crea un ordine per il primo utente
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            // Prova a modificare con il secondo utente
            const response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${otherUserToken}`)
                .send({ status: OrderStatus.CONFIRMED });

            expect(response.status).toBe(404);
        });

        it('non dovrebbe permettere di eliminare gli ordini di un altro utente', async () => {
            // Crea un ordine per il primo utente
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            // Prova a eliminare con il secondo utente
            const response = await request(app)
                .delete(`/api/orders/${savedOrder._id}`)
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(response.status).toBe(404);

            // Verifica che l'ordine esista ancora
            const orderStillExists = await Order.findById(savedOrder._id);
            expect(orderStillExists).not.toBeNull();
        });
    });

    // Test per gestione stati dell'ordine
    describe('Gestione stati dell\'ordine', () => {
        it('dovrebbe permettere di cancellare un ordine con un motivo valido', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            const response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    status: OrderStatus.CANCELLED,
                    cancellationReason: 'customer_request',
                    cancellationNotes: 'Cliente ha chiamato per annullare'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', OrderStatus.CANCELLED);
            expect(response.body).toHaveProperty('cancellationReason', 'customer_request');
            expect(response.body).toHaveProperty('cancellationNotes', 'Cliente ha chiamato per annullare');
        });

        it('dovrebbe gestire correttamente una sequenza di cambi di stato', async () => {
            // Crea un ordine di test
            const order = new Order({
                storeId: userId,
                items: [{ menuItem: menuItemId, quantity: 1 }],
                totalPrice: 10.99,
                status: OrderStatus.PENDING,
                slot: 1,
                customerInfo: { name: 'Test Customer' }
            });
            const savedOrder = await order.save();

            // Da PENDING a CONFIRMED
            let response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: OrderStatus.CONFIRMED });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', OrderStatus.CONFIRMED);

            // Da CONFIRMED a PREPARING
            response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: OrderStatus.PREPARING });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', OrderStatus.PREPARING);

            // Da PREPARING a READY
            response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: OrderStatus.READY });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', OrderStatus.READY);

            // Da READY a COMPLETED
            response = await request(app)
                .patch(`/api/orders/${savedOrder._id}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: OrderStatus.COMPLETED });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('status', OrderStatus.COMPLETED);
        });
    });
});