(function() {
    "use strict";

    // Configuración de Supabase
    const SUPABASE_URL = 'https://njaqtzpympuvaoymxazv.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYXF0enB5bXB1dmFveW14YXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTg5MjksImV4cCI6MjA5OTc5NDkyOX0.S0dwgx29tCd6xTfsgqjqqqlLECeFVRjnoNIMJH2tXv0';
    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    let carrito = [];
    let filtroActual = 'all';
    let busquedaActual = '';

    const grid = document.getElementById('productGrid');
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const cartCount = document.getElementById('cartCount');
    const countNum = document.getElementById('countNum');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const filtersContainer = document.getElementById('filtersContainer');

    // Elementos del Modal del Carrito (Corregidos a los IDs del HTML)
    const headerCart = document.querySelector('.header-cart');
    const cartModalOverlay = document.getElementById('cartModalOverlay');
    const cartCloseBtn = document.getElementById('cartCloseBtn');
    const cartItemsContainer = document.getElementById('cartBody'); // Apunta a #cartBody
    const cartTotalPrice = document.getElementById('cartTotal'); // Apunta a #cartTotal
    const checkoutBtn = document.querySelector('.btn-checkout');

    // Cargar categorías dinámicamente desde Supabase
    async function cargarCategorias() {
        const { data: categorias, error } = await supabaseClient.from('categorias').select('*');
        if (error) {
            console.error('Error cargando categorías:', error.message);
            return;
        }

        categorias.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.filter = cat.id;
            btn.textContent = cat.nombre;
            btn.addEventListener('click', function() {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                filtroActual = this.dataset.filter;
                renderProductos();
            });
            filtersContainer.insertBefore(btn, document.getElementById('resultsCount'));
        });
    }

    // Cargar productos desde Supabase
    async function renderProductos() {
        let query = supabaseClient.from('productos').select('*');

        if (filtroActual !== 'all') {
            query = query.eq('categoria_id', filtroActual);
        }

        if (busquedaActual.trim() !== '') {
            query = query.ilike('nombre', `%${busquedaActual}%`);
        }

        const { data: productos, error } = await query;

        if (error) {
            console.error('Error al cargar productos:', error.message);
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:red;">Error al conectar con la base de datos.</div>`;
            return;
        }

        grid.innerHTML = '';
        countNum.textContent = productos.length;

        if (productos.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:4rem 0;color:#999;background:#fbfbfb;border-radius:48px;border:2px dashed #eee;">
                    <div style="font-size:3rem;margin-bottom:1rem;">🔍</div>
                    <h3 style="color:#555;">No se encontraron productos</h3>
                </div>
            `;
            return;
        }

        productos.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const imgDiv = document.createElement('div');
            imgDiv.className = 'product-image';
            if (prod.imagen_url) {
                const img = document.createElement('img');
                img.src = prod.imagen_url;
                img.alt = prod.nombre;
                imgDiv.appendChild(img);
            } else {
                imgDiv.innerHTML = `
                    <div class="sin-imagen">
                        <svg viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" fill="none">
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
                            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" />
                            <polyline points="21 15 16 10 5 21" stroke="currentColor" />
                        </svg>
                        <span>sin imagen</span>
                    </div>
                `;
            }

            const infoDiv = document.createElement('div');
            infoDiv.className = 'product-info';

            const nombreEl = document.createElement('div');
            nombreEl.className = 'product-name';
            nombreEl.textContent = prod.nombre;

            const detalleEl = document.createElement('div');
            detalleEl.className = 'product-details';
            let dimText = '';
            if (prod.largo && prod.ancho) dimText = `📐 ${prod.largo} × ${prod.ancho} cm`;
            detalleEl.textContent = dimText || '📏 Dimensiones estándar';

            const coloresEl = document.createElement('div');
            coloresEl.className = 'product-colors';
            coloresEl.textContent = prod.colores ? `🎨 ${prod.colores}` : '🎨 Único';

            const priceEl = document.createElement('div');
            priceEl.className = 'product-price';
            priceEl.innerHTML = `$${prod.precio} <small>USD</small>`;

            const btnComprar = document.createElement('button');
            btnComprar.className = 'btn-comprar';
            btnComprar.textContent = '🛒 Agregar al carrito';
            btnComprar.addEventListener('click', () => agregarAlCarrito(prod));

            infoDiv.appendChild(nombreEl);
            infoDiv.appendChild(detalleEl);
            infoDiv.appendChild(coloresEl);
            infoDiv.appendChild(priceEl);
            infoDiv.appendChild(btnComprar);

            card.appendChild(imgDiv);
            card.appendChild(infoDiv);
            grid.appendChild(card);
        });
    }

    function agregarAlCarrito(producto) {
        const existente = carrito.find(item => item.id === producto.id);
        if (existente) {
            existente.cantidad++;
        } else {
            carrito.push({ ...producto, cantidad: 1 });
        }
        actualizarCarrito();
        mostrarToast(`✅ ${producto.nombre} añadido al carrito`);
    }

    function actualizarCarrito() {
        const total = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        cartCount.textContent = total;
    }

    function renderizarContenidoCarrito() {
        cartItemsContainer.innerHTML = '';

        if (carrito.length === 0) {
            cartItemsContainer.innerHTML = `
                <div style="text-align:center;color:#999;margin-top:3rem;">
                    <div style="font-size:2.5rem;margin-bottom:0.5rem;">🛒</div>
                    <p>Tu carrito está vacío</p>
                </div>
            `;
            cartTotalPrice.textContent = '$0.00';
            return;
        }

        let totalPagar = 0;

        carrito.forEach(item => {
            totalPagar += item.precio * item.cantidad;

            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <img src="${item.imagen_url || 'https://via.placeholder.com/60'}" alt="${item.nombre}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.nombre}</div>
                    <div class="cart-item-price">$${item.precio} USD</div>
                    <div class="cart-item-controls">
                        <button class="btn-restar">-</button>
                        <span>${item.cantidad}</span>
                        <button class="btn-sumar">+</button>
                    </div>
                    <button class="cart-item-remove">Eliminar</button>
                </div>
            `;

            const btnRestar = itemDiv.querySelector('.btn-restar');
            const btnSumar = itemDiv.querySelector('.btn-sumar');
            const btnEliminar = itemDiv.querySelector('.cart-item-remove');

            btnRestar.addEventListener('click', () => {
                if (item.cantidad > 1) {
                    item.cantidad--;
                } else {
                    carrito = carrito.filter(p => p.id !== item.id);
                }
                actualizarCarrito();
                renderizarContenidoCarrito();
            });

            btnSumar.addEventListener('click', () => {
                item.cantidad++;
                actualizarCarrito();
                renderizarContenidoCarrito();
            });

            btnEliminar.addEventListener('click', () => {
                carrito = carrito.filter(p => p.id !== item.id);
                actualizarCarrito();
                renderizarContenidoCarrito();
            });

            cartItemsContainer.appendChild(itemDiv);
        });

        cartTotalPrice.textContent = `$${totalPagar.toFixed(2)}`;
    }

    let toastTimeout;
    function mostrarToast(mensaje) {
        toastMessage.textContent = mensaje;
        toast.classList.add('show');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Eventos para abrir y cerrar el modal del carrito
    if (headerCart) {
        headerCart.addEventListener('click', () => {
            renderizarContenidoCarrito();
            cartModalOverlay.classList.add('active');
        });
    }

    if (cartCloseBtn) {
        cartCloseBtn.addEventListener('click', () => {
            cartModalOverlay.classList.remove('active');
        });
    }

    if (cartModalOverlay) {
        cartModalOverlay.addEventListener('click', (e) => {
            if (e.target === cartModalOverlay) {
                cartModalOverlay.classList.remove('active');
            }
        });
    }

    if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => {
                if (carrito.length === 0) {
                    mostrarToast('⚠️ El carrito está vacío');
                    return;
                }
                
                // ¡ESTA ES LA LÍNEA MÁGICA QUE FALTABA!
                // Guardamos el arreglo 'carrito' en localStorage con el nombre 'cart'
                localStorage.setItem('cart', JSON.stringify(carrito));
                
                // Redirige a la página de formulario de pago tipo pasarela
                window.location.href = 'checkout.html';
            });
        }

    searchBtn.addEventListener('click', () => {
        busquedaActual = searchInput.value;
        renderProductos();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            busquedaActual = searchInput.value;
            renderProductos();
        }
    });

    // Botón "Todos" por defecto
    const btnTodos = document.querySelector('[data-filter="all"]');
    if (btnTodos) {
        btnTodos.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtroActual = 'all';
            renderProductos();
        });
    }
    
 // Inicializar datos al cargar la página de forma segura
    async function init() {
        try {
            await cargarCategorias();
        } catch (e) {
            console.error("No se pudieron cargar las categorías, cargando productos por defecto...", e);
        }
        await renderProductos();
    }

    init();
})();