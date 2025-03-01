import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MenuItem from './models/MenuItem.js';

dotenv.config();

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/idea-app';

async function setupTestData() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connesso a MongoDB");

        // Svuota la collezione esistente
        await MenuItem.deleteMany({ storeId: '1234' });

        // Crea elementi di menu di esempio
        const menuItems = [
            {
                name: "Pizza Margherita",
                price: 8.5,
                description: "Pomodoro, mozzarella e basilico",
                category: "Pizze",
                storeId: "1234"
            },
            {
                name: "Pizza Diavola",
                price: 9.5,
                description: "Pomodoro, mozzarella e salame piccante",
                category: "Pizze",
                storeId: "1234"
            },
            {
                name: "Coca Cola",
                price: 3.0,
                description: "33cl",
                category: "Bevande",
                storeId: "1234"
            },
            {
                name: "Acqua",
                price: 2.0,
                description: "50cl",
                category: "Bevande",
                storeId: "1234"
            },
            {
                name: "Tiramisu",
                price: 5.0,
                description: "Fatto in casa",
                category: "Dolci",
                storeId: "1234"
            }
        ];

        await MenuItem.insertMany(menuItems);
        console.log("Dati di esempio inseriti con successo!");

        process.exit(0);
    } catch (error) {
        console.error("Errore:", error);
        process.exit(1);
    }
}

setupTestData();