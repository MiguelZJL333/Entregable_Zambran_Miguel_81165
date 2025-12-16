//Importaciones
import express from 'express';
import productsRouter from './ProductManager.js';
import CartManager from './CartManager.js';
import http from 'http';
import { engine } from "express-handlebars";
import viewsRouter from './routes/views.router.js';
import { Server } from 'socket.io';
import { ProductManager } from './ProductManager.js';

//Inicializaciones
const app = express();
const cartManager = new CartManager();
const server = http.createServer(app);
const io = new Server(server);

// Handlebars configuration
// Helper para obtener la URL de la imagen
function getImageUrlHelper(thumbnails) {
    if (!thumbnails) return '/img/placeholder.jpg'; // Imagen por defecto si no hay
    
    // Si es un array, tomar el primer elemento o usar placeholder
    if (Array.isArray(thumbnails)) {
        if (thumbnails.length > 0 && thumbnails[0]) {
            // Convertir ruta relativa a absoluta
            return thumbnails[0].startsWith('/') ? thumbnails[0] : thumbnails[0].replace('./', '/');
        }
        return '/img/placeholder.jpg';
    }
    
    // Si es un string, convertir ruta relativa a absoluta
    if (typeof thumbnails === 'string' && thumbnails.trim() !== '') {
        return thumbnails.startsWith('/') ? thumbnails : thumbnails.replace('./', '/');
    }
    
    return '/img/placeholder.jpg';
}

const hbs = engine({
    helpers: {
        getImageUrl: getImageUrlHelper
    }
});

app.engine('handlebars', hbs); 
app.set('view engine', 'handlebars'); 
app.set('views', './src/views');

//Puertos
const PORT = 8080;

//Habilitar lectura de JSON
app.use(express.json());

//Habilitar lectura de public
app.use(express.static('public')); 


//websocket desde el servidor
const productManager = new ProductManager('./src/products.json');
io.on('connection', (socket) => {
    console.log('Nuevo Usuario Conectado');

    // Escuchar evento de nuevo producto
    socket.on('newProduct', async (productData) => {
        try {
            // Validar campos requeridos
            const required = ['title', 'description', 'code', 'price', 'stock', 'category'];
            const missing = [];
            for (const field of required) {
                if (!productData[field] && productData[field] !== 0) {
                    missing.push(field);
                }
            }
            
            if (missing.length > 0) {
                socket.emit('error', { message: `Faltan campos obligatorios: ${missing.join(', ')}` });
                return;
            }

            // Convertir price y stock a números
            if (typeof productData.price === 'string') {
                productData.price = parseFloat(productData.price);
            }
            if (typeof productData.stock === 'string') {
                productData.stock = parseInt(productData.stock, 10);
            }

            const newproduct = await productManager.addProduct(productData);
            io.emit('productAdded', newproduct);
            
        } catch (error) {
            console.error('Error al agregar producto:', error);
            socket.emit('error', { message: error.message || 'Error al agregar producto' });
        }
    });

    // Escuchar evento de eliminar producto
    socket.on('deleteProduct', async (productId) => {
        try {
            if (!productId) {
                socket.emit('error', { message: 'ID de producto no proporcionado' });
                return;
            }

            await productManager.deleteProductById(productId);
            io.emit('productDeleted', { id: productId });
            console.log(`Producto ${productId} eliminado`);
            
        } catch (error) {
            console.error('Error al eliminar producto:', error);
            socket.emit('error', { message: error.message || 'Error al eliminar producto' });
        }
    });
});

// Montar router de productos
app.use('/api/products', productsRouter);
app.use('/', viewsRouter);

//percitencia en memoria
const messages = [];    

// Server
server.listen(8080, () => {
    console.log('Corriendo en el puerto 8080, http://localhost:8080');
});

// Manejo de errores del servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error('\n❌ Error: El puerto 8080 ya está en uso.');
        console.error('💡 Soluciones:');
        console.error('   1. Cierra la otra instancia del servidor que está corriendo');
        console.error('   2. O mata el proceso con: taskkill /PID <PID> /F');
        console.error('   3. Para encontrar el PID: netstat -ano | findstr :8080\n');
        process.exit(1);
    } else {
        console.error('❌ Error del servidor:', error);
        process.exit(1);
    }
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


