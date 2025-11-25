import fs from 'fs';

class CartManager {
    constructor() {
        this.path = './src/carts.json';
    }

    // Generar nuevo ID
    generateNewId(carts) {
        if (Array.isArray(carts) && carts.length > 0) {
            const last = carts[carts.length - 1];
            return (typeof last.id === 'number') ? last.id + 1 : carts.length + 1;
        }
        return 1;
    }

    //addCart
    async addCart() {
        let carts = [];
        try {
            const cartsJson = await fs.promises.readFile(this.path, 'utf-8');
            carts = JSON.parse(cartsJson);
        } catch (err) {
            if (err.code && err.code === 'ENOENT') {
                carts = [];
            } else {
                throw err;
            }
        }
        // Crear nuevo carrito
        const id = this.generateNewId(carts);
        carts.push({ id, products: [] });
        await fs.promises.writeFile(this.path, JSON.stringify(carts, null, 2), 'utf-8');
        return carts;
    }

    // Normaliza y desduplica productos de un carrito: usa `id` como clave
    dedupeCartProducts(cart) {
        if (!cart || !Array.isArray(cart.products)) return;
        const map = new Map();
        for (const p of cart.products) {
            const key = String(p.id ?? p.pid ?? '');
            const qty = Number(p.quantity ?? 0);
            if (!key) continue;
            if (map.has(key)) {
                map.get(key).quantity += qty;
            } else {
                map.set(key, { id: key, quantity: qty });
            }
        }
        cart.products = Array.from(map.values());
    }

    //getProductsIUnCartByid
    getProductsInCartById = async (cid) => {
        // Leer carritos desde el archivo
        const cartsJson = await fs.promises.readFile(this.path, 'utf-8');
        const carts = JSON.parse(cartsJson || '[]');

        // Buscar carrito por id (coerción a string para evitar problemas de tipo)
        const cart = carts.find(c => String(c.id) === String(cid));
        if (!cart) return [];
        // Normalizar y desduplicar antes de devolver
        this.dedupeCartProducts(cart);
        return cart.products;
    }

    //addProductInCart
    async addProductInCart(cid, id, quantity) {
        const cartsJson = await fs.promises.readFile(this.path, 'utf-8');
        const carts = JSON.parse(cartsJson || '[]');

        // Buscar carrito por id (coerción a string para evitar problemas de tipo)
        const cart = carts.find(c => String(c.id) === String(cid));
        if (!cart) throw new Error(`Carrito con id ${cid} no encontrado`);

        if (!Array.isArray(cart.products)) cart.products = [];
        // Normalizar y desduplicar antes de operar
        this.dedupeCartProducts(cart);

        const qty = Number(quantity ?? 1);

        // Buscar producto existente en el carrito (clave `id`)
        const existing = cart.products.find(p => String(p.id) === String(id));
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 0) + qty;
        } else {
            cart.products.push({ id: String(id), quantity: qty });
        }

        // Asegurar que no queden duplicados y guardar
        this.dedupeCartProducts(cart);
        await fs.promises.writeFile(this.path, JSON.stringify(carts, null, 2), 'utf-8');
        return cart;
    }
}

export default CartManager;