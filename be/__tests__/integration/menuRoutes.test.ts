import request from 'supertest';
import mongoose from 'mongoose';
import { setupTestUser } from '../helpers.js';
import MenuItem from '../../models/MenuItem.js';
import { app } from '../../server.js';
import jwt from 'jsonwebtoken';
import User from '../../models/User.js';

// Importa la configurazione del database di test
import '../setup.js';

describe('Menu Routes', () => {
    let token: string;
    let userId: string;
    let menuItemId: string;

    beforeEach(async () => {
        // Crea utente e token per i test
        const { user, token: authToken } = await setupTestUser();
        token = authToken;
        userId = (user._id as mongoose.Types.ObjectId).toString();

        // Crea un menu item di test
        const menuItemData = {
            name: 'Test Pizza',
            description: 'Test Description',
            price: 10.99,
            available: true,
            storeId: userId
        };

        const menuItem = new MenuItem(menuItemData);
        await menuItem.save();
        menuItemId = (menuItem._id as mongoose.Types.ObjectId).toString();
    });

    describe('GET /api/menu', () => {
        it('dovrebbe ottenere tutti gli elementi del menu dell\'utente', async () => {
            const response = await request(app)
                .get('/api/menu')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Test Pizza');
            expect(response.body[0].storeId).toBe(userId);
        });

        it('dovrebbe restituire 401 senza token', async () => {
            const response = await request(app).get('/api/menu');
            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/menu', () => {
        it('dovrebbe creare un nuovo elemento del menu', async () => {
            const newItem = {
                name: 'Nuova Pizza',
                description: 'Pizza fresca',
                price: 12.99,
                available: true
            };

            const response = await request(app)
                .post('/api/menu')
                .set('Authorization', `Bearer ${token}`)
                .send(newItem);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body.storeId).toBe(userId);
            expect(response.body.name).toBe('Nuova Pizza');
            expect(response.body.price).toBe(12.99);
        });

        it('dovrebbe restituire 401 senza token', async () => {
            const response = await request(app)
                .post('/api/menu')
                .send({});

            expect(response.status).toBe(401);
        });

        it('dovrebbe validare i dati in input', async () => {
            // Manca il prezzo (obbligatorio)
            const invalidItem = {
                name: 'Test Pizza',
                description: 'Test Description',
                available: true
            };

            const response = await request(app)
                .post('/api/menu')
                .set('Authorization', `Bearer ${token}`)
                .send(invalidItem);

            expect(response.status).toBe(400);
        });
    });

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

        it('un utente non dovrebbe vedere gli elementi del menu di un altro utente', async () => {
            const response = await request(app)
                .get('/api/menu')
                .set('Authorization', `Bearer ${otherUserToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBe(0);  // Non dovrebbe vedere l'elemento creato dal primo utente
        });
    });

    // Suggerimento: implementare e testare anche PUT e DELETE
    // Le API per aggiornare ed eliminare elementi del menu sono essenziali
});