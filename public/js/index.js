// Initialize Socket.IO client
const socket = io();

const formNewProducts = document.getElementById('formNewProducts');

formNewProducts.addEventListener('submit', (e) => {
    e.preventDefault(); // Evitar el envío del formulario

    // Obtener los datos del formulario
    const formData = new FormData(formNewProducts);
    const productData = {};

    // Convertir FormData a un objeto simple
    formData.forEach((value, key) => {
        productData[key] = value;
    });

    // Enviar los datos al servidor vía Socket.IO
    socket.emit('newProduct', productData);
});

// Función helper para obtener la URL de la imagen (igual que en el helper de Handlebars)
function getImageUrl(thumbnails) {
    if (!thumbnails) return '/img/placeholder.jpg';
    
    if (Array.isArray(thumbnails)) {
        if (thumbnails.length > 0 && thumbnails[0]) {
            return thumbnails[0].startsWith('/') ? thumbnails[0] : thumbnails[0].replace('./', '/');
        }
        return '/img/placeholder.jpg';
    }
    
    if (typeof thumbnails === 'string' && thumbnails.trim() !== '') {
        return thumbnails.startsWith('/') ? thumbnails : thumbnails.replace('./', '/');
    }
    
    return '/img/placeholder.jpg';
}

// Escuchar el evento de confirmación de nuevo producto agregado
socket.on('productAdded', (newProduct) => {
    const productsList = document.getElementById('productsList');
    const card = document.createElement('div');
    card.className = 'product-card';
    card.id = `product-${newProduct.id}`;
    
    // Construir el HTML con el mismo formato que las vistas
    let productHTML = '<div class="product-image-container">';
    const imageUrl = getImageUrl(newProduct.Thumbnails || newProduct.thumbnails);
    productHTML += `<img src="${imageUrl}" alt="${newProduct.title}" class="product-image" onerror="this.src='/img/placeholder.jpg'; this.onerror=null;">`;
    productHTML += '</div>';
    
    productHTML += '<div class="product-info">';
    productHTML += `<h4 class="product-title">${newProduct.title}</h4>`;
    productHTML += `<p class="product-price">$${newProduct.price}</p>`;
    
    if (newProduct.description) {
        productHTML += `<p class="product-description">${newProduct.description}</p>`;
    }
    
    if (newProduct.category) {
        productHTML += `<span class="product-category">${newProduct.category}</span>`;
    }
    
    if (newProduct.stock !== undefined) {
        productHTML += `<p class="product-stock">Stock: ${newProduct.stock}</p>`;
    }
    
    productHTML += `<button class="delete-btn" data-id="${newProduct.id}">Eliminar</button>`;
    productHTML += '</div>';
    
    card.innerHTML = productHTML;
    productsList.appendChild(card);
    
    // Agregar event listener al nuevo botón
    const deleteBtn = card.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        socket.emit('deleteProduct', newProduct.id);
    });
    
    // Limpiar el formulario después de agregar el producto
    formNewProducts.reset();
    console.log('Producto agregado exitosamente:', newProduct);
});

// Escuchar evento de producto eliminado
socket.on('productDeleted', (data) => {
    const productElement = document.getElementById(`product-${data.id}`);
    if (productElement) {
        // Agregar animación de desvanecimiento antes de eliminar
        productElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        productElement.style.opacity = '0';
        productElement.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
            productElement.remove();
            console.log(`Producto ${data.id} eliminado`);
        }, 300);
    }
});

// Agregar event listeners a los botones de eliminar existentes
document.addEventListener('DOMContentLoaded', () => {
    const deleteButtons = document.querySelectorAll('.delete-btn');
    deleteButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const productId = btn.getAttribute('data-id');
            socket.emit('deleteProduct', productId);
        });
    });
});

// Escuchar errores del servidor
socket.on('error', (error) => {
    console.error('Error:', error.message);
    alert('Error: ' + error.message);
});
