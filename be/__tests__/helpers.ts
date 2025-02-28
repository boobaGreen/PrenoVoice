import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import MenuItem, { IMenuItem } from '../models/MenuItem.js';

// Crea un utente di test e restituisce il token
export const setupTestUser = async () => {
    const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
    };

    const user = new User(userData);
    await user.save();

    const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
    );

    return { user, token };
};

// Crea un menu item di test
export const createTestMenuItem = async (storeId: string): Promise<IMenuItem> => {
    const menuItemData = {
        name: 'Test Pizza',
        description: 'Test Description',
        price: 10.99,
        available: true,
        storeId
    };

    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();
    return menuItem;
};