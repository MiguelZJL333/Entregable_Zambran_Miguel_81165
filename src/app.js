//Importaciones
import express from 'express';
import productsRouter from './ProductManager.js';
import CartManager from './CartManager.js';
import http from 'http';
import { engine } from "express-handlebars";
import viewsRouter from './routes/views.router.js';
import { Server } from 'socket.io';

//Inicializaciones
const app = express();
const cartManager = new CartManager();
const server = http.createServer(app);

app.use(express.json());

//WebSocket
const io = new Server(server);

//websocket desde el servidor
io.on('connection', (socket) => {
    console.log('New client connected');

    //emitimos un mensaje al cliente
    socket.emit("message history", messages);

    // Escuchar el evento "Nuevo Mensaje" desde el cliente
    socket.on("Nuevo Mensaje", (data) => {
        messages.push(data); 
        io.emit("broadcast new message", data); // Emitir el evento "Actualizar Mensajes" a todos los clientes conectados
    });
})

//Configuraciones
app.use(express.static('public')); 

// Handlebars configuration
app.engine('handlebars', engine()); 
app.set('view engine', 'handlebars'); 
app.set('views', './src/views');

//Endpoints de vistas
app.use('/', viewsRouter);

//percitencia en memoria
const messages = [];    


// Montar router de productos
app.use('/api/products', productsRouter);

// Server
app.listen(8080, () => {
    console.log('Corriendo en el puerto 8080, http://localhost:8080');
});

//--------------------------------Carts--------------------------------------------

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


