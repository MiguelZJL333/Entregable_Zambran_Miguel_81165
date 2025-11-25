import express from 'express';
import productsRouter from './ProductManager.js';
import CartManager from './CartManager.js';

const app = express();
const cartManager = new CartManager();
app.use(express.json());

// Montar router de productos
app.use('/api/products', productsRouter);

// Server
app.listen(8080, () => {
    console.log('Server is running on port 8080');
});

// Alias: aceptar también la ruta plural '/products/:id' para compatibilidad
app.post('/api/carts/:cid/products/:id', async (req, res) => {
    try {
        const cid = req.params.cid;
        const id = req.params.id;
        let quantity = 1;
        if (req.body && req.body.quantity !== undefined) {
            const q = req.body.quantity;
            quantity = typeof q === 'number' ? q : parseInt(String(q), 10) || 1;
        }

        const cart = await cartManager.addProductInCart(cid, id, quantity);
        return res.status(200).json({ message: 'Producto agregado al carrito', cart });
    } catch (err) {
        console.error('Error en POST /api/carts/:cid/products/:id (alias)', err);
        if (err.message && err.message.includes('no encontrado')) {
            return res.status(404).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || 'Bad Request' });
    }
});
//--------------------------------Carts--------------------------------------------

// Crear nuevo carrito
app.post('/api/carts', async (req, res) => {
    try {
        const carts = await cartManager.addCart();
        const created = Array.isArray(carts) ? carts[carts.length - 1] : carts;
        return res.status(201).json({ message: 'Carrito creado', cart: created });
    } catch (err) {
        console.error('Error creando carrito', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Lista de los productos que pertenece a un carrito 
app.get('/api/carts/:cid', async (req, res) => {
    try {
        const cid = req.params.cid;
        const products = await cartManager.getProductsInCartById(cid);
        if (!products || products.length === 0) return res.status(404).json({ error: `Carrito ${cid} no encontrado o vacío` });
        return res.status(200).json({ products, message: `Productos en el carrito ${cid}` });
    } catch (err) {
        console.error('Error en GET /api/carts/:cid', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Agregar un producto al carrito indicado
app.post('/api/carts/:cid/product/:id', async (req, res) => {
    try {
        const cid = req.params.cid;
        const id = req.params.id;
        // Normalizar quantity: si viene string intentar parseInt, por defecto 1
        let quantity = 1;
        if (req.body && req.body.quantity !== undefined) {
            const q = req.body.quantity;
            quantity = typeof q === 'number' ? q : parseInt(String(q), 10) || 1;
        }

        const cart = await cartManager.addProductInCart(cid, id, quantity);
        return res.status(200).json({ message: 'Producto agregado al carrito', cart });
    } catch (err) {
        console.error('Error en POST /api/carts/:cid/product/:id', err);
        if (err.message && err.message.includes('no encontrado')) {
            return res.status(404).json({ error: err.message });
        }
        return res.status(400).json({ error: err.message || 'Bad Request' });
    }
});


