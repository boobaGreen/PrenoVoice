import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { app } from '../../server.js';
import User from '../../models/User.js';

// Importa la configurazione del database di test
import '../setup.js';

describe('User Routes', () => {
    let userId: string;
    let token: string;  // Aggiungiamo un token per l'autenticazione

    beforeEach(async () => {
        // Crea un utente di test per le route che richiedono un utente esistente
        const userData = {
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password123'
        };

        const user = new User(userData);
        await user.save();
        userId = (user._id as mongoose.Types.ObjectId).toString();

        // Genera un token JWT per l'utente di test
        token = jwt.sign(
            { id: userId, name: user.name, email: user.email },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    describe('GET /api/users', () => {
        it('dovrebbe ottenere tutti gli utenti', async () => {
            const response = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0]).toHaveProperty('name', 'Test User');
            expect(response.body[0]).toHaveProperty('email', 'testuser@example.com');
            // Verifica che la password non sia inclusa nella risposta
            expect(response.body[0].password).toBeUndefined();
        });

        it('dovrebbe restituire 401 senza token', async () => {
            const response = await request(app).get('/api/users');
            expect(response.status).toBe(401);
        });
    });

    describe('GET /api/users/:id', () => {
        it('dovrebbe ottenere un utente specifico', async () => {
            const response = await request(app)
                .get(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('_id', userId);
            expect(response.body).toHaveProperty('name', 'Test User');
            expect(response.body).toHaveProperty('email', 'testuser@example.com');
        });

        it('dovrebbe restituire 404 per ID non esistente', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            // Il token apparterrà all'utente principale del test, quindi dobbiamo generare
            // un token specifico per questo test che corrisponda all'ID finto
            const fakeToken = jwt.sign(
                { id: fakeId, name: 'Fake', email: 'fake@example.com' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .get(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${fakeToken}`);

            expect(response.status).toBe(404);
        });

        it('dovrebbe restituire 403 quando si accede ai dati di un altro utente', async () => {
            // Crea un secondo utente
            const otherUser = new User({
                name: 'Other User',
                email: 'other@example.com',
                password: 'password123'
            });
            await otherUser.save();
            const otherUserId = (otherUser._id as mongoose.Types.ObjectId).toString();

            // Usa il token dell'utente principale per accedere ai dati dell'altro utente
            const response = await request(app)
                .get(`/api/users/${otherUserId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });
    });

    describe('POST /api/users', () => {
        it('dovrebbe creare un nuovo utente', async () => {
            const newUser = {
                name: 'New Test User',
                email: 'newtestuser@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users')
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('_id');
            expect(response.body).toHaveProperty('name', 'New Test User');
            expect(response.body).toHaveProperty('email', 'newtestuser@example.com');
            // Verifica che la password non sia inclusa nella risposta
            expect(response.body.password).toBeUndefined();
        });

        it('dovrebbe rifiutare la creazione senza email', async () => {
            const invalidUser = {
                name: 'Invalid User',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users')
                .send(invalidUser);

            expect(response.status).toBe(500); // Idealmente dovresti restituire 400 per dati invalidi
        });

        it('dovrebbe rifiutare email duplicate', async () => {
            const duplicateUser = {
                name: 'Duplicate User',
                email: 'testuser@example.com', // Email già utilizzata
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/users')
                .send(duplicateUser);

            expect(response.status).toBe(500); // Idealmente dovresti restituire 409 per conflitti
        });
    });

    describe('PATCH /api/users/:id', () => {
        it('dovrebbe aggiornare un utente esistente', async () => {
            const updatedData = {
                name: 'Updated User Name'
            };

            const response = await request(app)
                .patch(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${token}`)
                .send(updatedData);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('_id', userId);
            expect(response.body).toHaveProperty('name', 'Updated User Name');
            expect(response.body).toHaveProperty('email', 'testuser@example.com');
        });

        it('dovrebbe restituire 403 quando si tenta di aggiornare un altro utente', async () => {
            // Crea un secondo utente
            const otherUser = new User({
                name: 'Other User',
                email: 'other@example.com',
                password: 'password123'
            });
            await otherUser.save();
            const otherUserId = (otherUser._id as mongoose.Types.ObjectId).toString();

            const response = await request(app)
                .patch(`/api/users/${otherUserId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Attempted Update' });

            expect(response.status).toBe(403);
        });

        it('dovrebbe restituire 404 per ID non esistente', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            // Creiamo un token che corrisponda all'ID finto
            const fakeToken = jwt.sign(
                { id: fakeId, name: 'Fake', email: 'fake@example.com' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .patch(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${fakeToken}`)
                .send({ name: 'Updated' });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/users/:id', () => {
        it('dovrebbe eliminare un utente', async () => {
            const response = await request(app)
                .delete(`/api/users/${userId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Utente eliminato correttamente');

            // Verifica che l'utente sia stato effettivamente eliminato
            const userExists = await User.findById(userId);
            expect(userExists).toBeNull();
        });

        it('dovrebbe restituire 403 quando si tenta di eliminare un altro utente', async () => {
            // Crea un secondo utente
            const otherUser = new User({
                name: 'Other User',
                email: 'other@example.com',
                password: 'password123'
            });
            await otherUser.save();
            const otherUserId = (otherUser._id as mongoose.Types.ObjectId).toString();

            const response = await request(app)
                .delete(`/api/users/${otherUserId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });

        it('dovrebbe restituire 404 per ID non esistente', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            // Creiamo un token che corrisponda all'ID finto
            const fakeToken = jwt.sign(
                { id: fakeId, name: 'Fake', email: 'fake@example.com' },
                process.env.JWT_SECRET || 'test-secret',
                { expiresIn: '1h' }
            );

            const response = await request(app)
                .delete(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${fakeToken}`);

            expect(response.status).toBe(404);
        });
    });
});