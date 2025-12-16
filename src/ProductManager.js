import fs from 'fs/promises';
import crypto from 'crypto';
import { Router } from 'express';

// Modelo / normalizador de producto
function normalizeProduct(input) {
    // Crear un mapa case-insensitive de las claves para aceptar variantes en el body
    const src = {};
    for (const k in (input || {})) {
        src[k.toLowerCase()] = input[k];
    }

    return {
        title: typeof src.title === 'string' ? src.title.trim() : '',
        description: src.description || '',
        code: src.code || '',
        price: Number(src.price ?? 0),
        status: src.status === undefined || src.status === null ? true : (
            typeof src.status === 'string' ?
                (src.status.toLowerCase() === 'true' || src.status.toLowerCase() === 'active') :
                Boolean(src.status)
        ),
        stock: Number(src.stock ?? 0),
        category: src.category || '',
        thumbnails: Array.isArray(src.thumbnails) ? src.thumbnails : (
            typeof src.thumbnails === 'string' ? [src.thumbnails] : []
        )
    };
}

// Clase para manejar productos
class ProductManager {
    constructor(pathFile) {
        this.pathFile = pathFile;
    }

    // Genera un ID único
    generateNewId() {
        return crypto.randomUUID();
    }

    // Obtiene todos los productos
    async getProducts() {
        try {
            const fileData = await fs.readFile(this.pathFile, 'utf-8');
            return JSON.parse(fileData);
        } catch (err) {
            if (err.code === 'ENOENT') return [];
            throw err;
        }
    }

    // Agrega un nuevo producto
    async addProduct(raw) {
        const products = await this.getProducts();
        const normalized = normalizeProduct(raw);
        const newId = this.generateNewId();
        const product = { id: newId, ...normalized };
        products.push(product);
        await fs.writeFile(this.pathFile, JSON.stringify(products, null, 2), 'utf-8');
        return product;
    }

    // Obtiene un producto por ID
    async getProductById(pid) {
        const products = await this.getProducts();
        return products.find((p) => p.id === pid) || null;
    }

    // Actualiza un producto por ID
    async updateProductById(pid, updatesRaw) {
        const products = await this.getProducts();
        const idx = products.findIndex((p) => p.id === pid);
        if (idx === -1) throw new Error(`Producto con id ${pid} no encontrado`);
        // Normalizar keys de updates a minúsculas para evitar duplicados de mayúsculas
        const updates = {};
        for (const k in (updatesRaw || {})) updates[k.toLowerCase()] = updatesRaw[k];
        delete updates.id;

        // Normalizar tipos
        if (updates.price !== undefined) updates.price = Number(updates.price);
        if (updates.stock !== undefined) updates.stock = Number(updates.stock);
        if (updates.status !== undefined) updates.status = (typeof updates.status === 'string') ?
            (updates.status.toLowerCase() === 'true' || updates.status.toLowerCase() === 'active') :
            Boolean(updates.status);

        products[idx] = { ...products[idx], ...updates };
        await fs.writeFile(this.pathFile, JSON.stringify(products, null, 2), 'utf-8');
        return products[idx];
    }

    // Elimina un producto por ID
    async deleteProductById(pid) {
        const products = await this.getProducts();
        const idx = products.findIndex((p) => p.id === pid);
        if (idx === -1) throw new Error(`Producto con id ${pid} no encontrado`);
        const filtered = products.filter((p) => p.id !== pid);
        await fs.writeFile(this.pathFile, JSON.stringify(filtered, null, 2), 'utf-8');
        return true;
    }
}

// Router que usa ProductManager
const router = Router();
const pm = new ProductManager('./src/products.json');

// Es para manejar rutas de productos
router.get('/', async (req, res) => {
    try {
        const products = await pm.getProducts();
        res.status(200).json({ message: 'Lista de Productos', products });
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Obtener producto por ID
router.get('/:pid', async (req, res) => {
    try {
        const { pid } = req.params;
        if (!pid || pid.trim() === '') return res.status(400).json({ error: 'Id inválido' });
        const product = await pm.getProductById(pid);
        if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
        res.status(200).json(product);
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Agregar nuevo producto
router.post('/', async (req, res) => {
    try {
        // Pasar el body tal cual; ProductManager.normalizeProduct se encarga de la normalización
        const required = ['title', 'description', 'code', 'price', 'stock', 'category'];
        const missing = [];
        for (const f of required) {
            if (req.body[f] === undefined && req.body[f.toLowerCase()] === undefined) missing.push(f);
        }
        if (missing.length > 0) {
            return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}` });
        }
        const product = await pm.addProduct(req.body);
        res.status(201).json({ message: 'Producto agregado', product });
    } catch (err) {
        console.error('Error en POST:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Actualizar producto por ID
router.put('/:pid', async (req, res) => {
    try {
        const { pid } = req.params;
        if (!pid || pid.trim() === '') return res.status(400).json({ error: 'Id inválido' });
        // Pasar el body tal cual; updateProductById limpia y normaliza internamente
        const updated = await pm.updateProductById(pid, req.body);
        res.status(200).json({ message: `Producto ${pid} actualizado`, product: updated });
    } catch (err) {
        if (err.message && err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Eliminar producto por ID
router.delete('/:pid', async (req, res) => {
    try {
        const { pid } = req.params;
        if (!pid || pid.trim() === '') return res.status(400).json({ error: 'Id inválido' });
        await pm.deleteProductById(pid);
        res.status(200).json({ message: `Producto ${pid} eliminado` });
    } catch (err) {
        if (err.message && err.message.includes('no encontrado')) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
// Exportar la clase también para poder usarla desde otros módulos
export { ProductManager };
