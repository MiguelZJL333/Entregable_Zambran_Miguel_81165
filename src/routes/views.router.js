import express from 'express';
import { ProductManager } from '../ProductManager.js';

const viewsRouter = express.Router();
// el archivo real de productos está en '../products.json' relativo a este router
const productManager = new ProductManager('./src/products.json');

viewsRouter.get('/', async(req, res) => {
    try {
        const products = await productManager.getProducts();
        res.render("home", { products: products });

    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

viewsRouter.get('/realtimeproducts', async(req, res) => {
    try {
        const products = await productManager.getProducts();
        res.render("realTimeProducts", { products: products });

    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});


export default viewsRouter;