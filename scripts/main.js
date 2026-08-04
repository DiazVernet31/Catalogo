(function() {
    document.addEventListener('DOMContentLoaded', () => {
        "use strict";

        let productos = [];
        let categorias = [];
        let categoriaSeleccionada = 'todos';
        let idProductoEditando = null;
        let idProductoEliminando = null;

        const grid = document.getElementById('productGrid');
        const modalProducto = document.getElementById('modalProducto');
        const modalTitulo = modalProducto.querySelector('h3');
        const btnGuardar = document.getElementById('btnGuardarProducto');
        const btnLimpiarImagen = document.getElementById('btnLimpiarImagen');
        const previewMini = document.getElementById('previewMini');
        const listaCategoriasDiv = document.getElementById('listaCategorias');
        
        const inputs = {
            nombre: document.getElementById('inputNombre'),
            precio: document.getElementById('inputPrecio'),
            imagen: document.getElementById('inputImagen')
        };

        // Inyectar select de categoría en el modal de productos dinámicamente si no existe
        const rowPrecio = modalProducto.querySelector('.modal-row');
        if (!document.getElementById('inputCategoria')) {
            const selectCatHtml = `
                <div style="margin-top: 15px;">
                    <label>Categoría <span class="obligatorio">*</span></label>
                    <select id="inputCategoria" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-top: 5px;"></select>
                </div>
            `;
            rowPrecio.insertAdjacentHTML('afterend', selectCatHtml);
        }
        const inputCategoria = document.getElementById('inputCategoria');

        // Modal para Gestionar Categorías (Agregar, Editar, Eliminar)
        const modalGestionCatHtml = `
            <div class="modal-overlay" id="modalGestionCategorias">
                <div class="modal-card" style="max-width: 400px;">
                    <h3>Gestionar Categorías</h3>
                    <div style="margin: 15px 0;">
                        <input type="text" id="inputNombreCat" placeholder="Nombre de la categoría" style="width: 100%; padding: 8px; margin-bottom: 10px; border: 1px solid #ccc; border-radius: 4px;">
                        <button id="btnGuardarCat" class="btn-guardar" style="width: 100%; padding: 8px;">Crear Categoría</button>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                    <div id="adminListaCategorias" style="max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;"></div>
                    <div class="modal-actions" style="margin-top: 20px;">
                        <button class="btn-cancelar" id="btnCerrarGestionCat">Cerrar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalGestionCatHtml);
        const modalGestionCategorias = document.getElementById('modalGestionCategorias');
        const adminListaCategorias = document.getElementById('adminListaCategorias');
        const inputNombreCat = document.getElementById('inputNombreCat');
        const btnGuardarCat = document.getElementById('btnGuardarCat');

        // Modal personalizado para Eliminar Productos
        const modalEliminarHtml = `
            <div class="modal-overlay" id="modalEliminar">
                <div class="modal-card" style="max-width: 350px;">
                    <h3>Eliminar Producto</h3>
                    <p style="margin: 20px 0; color: #333; font-size: 1rem;">¿Deseas eliminar este producto?</p>
                    <div class="modal-actions">
                        <button class="btn-cancelar" id="btnCancelarEliminar">Cancelar</button>
                        <button class="btn-guardar" id="btnConfirmarEliminar" style="background-color: #d9534f;">Eliminar</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalEliminarHtml);
        const modalEliminar = document.getElementById('modalEliminar');

        let idCatEditando = null; // Para saber si editamos categoría

        async function cargarDatosIniciales() {
            await cargarCategorias();
            await cargarProductosDesdeSupabase();
        }

        async function cargarCategorias() {
            const { data, error } = await window.supabaseClient.from('categorias').select('*');
            if (error) { console.error("Error cargando categorías:", error); return; }
            categorias = data || [];
            renderizarPestanasCategorias();
            llenarSelectCategoriasModal();
            renderizarAdminCategorias();
        }

        async function cargarProductosDesdeSupabase() {
            const { data, error } = await window.supabaseClient.from('productos').select('*');
            if (error) { console.error("Error:", error); return; }
            productos = data || [];
            renderProductos();
        }

        function renderizarPestanasCategorias() {
            let html = `<button class="cat-pill ${categoriaSeleccionada === 'todos' ? 'active' : ''}" data-id="todos" style="padding: 6px 14px; border-radius: 20px; border: 1px solid #ccc; background: ${categoriaSeleccionada === 'todos' ? '#f0ad4e' : '#fff'}; color: ${categoriaSeleccionada === 'todos' ? '#fff' : '#333'}; cursor: pointer; font-weight: 500; white-space: nowrap;">Todos</button>`;
            
            categorias.forEach(cat => {
                const activo = categoriaSeleccionada === cat.id;
                html += `<button class="cat-pill ${activo ? 'active' : ''}" data-id="${cat.id}" style="padding: 6px 14px; border-radius: 20px; border: 1px solid #ccc; background: ${activo ? '#f0ad4e' : '#fff'}; color: ${activo ? '#fff' : '#333'}; cursor: pointer; font-weight: 500; white-space: nowrap;">${cat.nombre}</button>`;
            });

            listaCategoriasDiv.innerHTML = html;

            document.querySelectorAll('.cat-pill').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    categoriaSeleccionada = e.target.getAttribute('data-id');
                    renderizarPestanasCategorias();
                    renderProductos();
                });
            });
        }

        function llenarSelectCategoriasModal() {
            let html = '<option value="">Selecciona una categoría</option>';
            categorias.forEach(cat => {
                html += `<option value="${cat.id}">${cat.nombre}</option>`;
            });
            inputCategoria.innerHTML = html;
        }

        function renderizarAdminCategorias() {
            if (categorias.length === 0) {
                adminListaCategorias.innerHTML = '<p style="font-size: 0.85rem; color: #777;">No hay categorías creadas.</p>';
                return;
            }

            let html = '';
            categorias.forEach(cat => {
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 6px 10px; border-radius: 4px;">
                        <span style="font-size: 0.9rem;">${cat.nombre}</span>
                        <div style="display: flex; gap: 5px;">
                            <button onclick="window.editarCatModal('${cat.id}', '${cat.nombre}')" style="background: #f0ad4e; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Editar</button>
                            <button onclick="window.eliminarCat('${cat.id}')" style="background: #d9534f; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Eliminar</button>
                        </div>
                    </div>
                `;
            });
            adminListaCategorias.innerHTML = html;
        }

        // Funciones globales para gestionar categorías desde el panel admin
        window.editarCatModal = function(id, nombre) {
            idCatEditando = id;
            inputNombreCat.value = nombre;
            btnGuardarCat.textContent = "Actualizar Categoría";
        }

        window.eliminarCat = async function(id) {
            if (!confirm("¿Eliminar esta categoría? Los productos asociados se quedarán sin categoría.")) return;
            const { error } = await window.supabaseClient.from('categorias').delete().eq('id', id);
            if (error) { alert("Error al eliminar categoría"); return; }
            cargarCategorias();
            cargarProductosDesdeSupabase();
        }

        btnGuardarCat.addEventListener('click', async () => {
            const nombre = inputNombreCat.value.trim();
            if (!nombre) { alert("Escribe un nombre"); return; }

            if (idCatEditando) {
                const { error } = await window.supabaseClient.from('categorias').update({ nombre }).eq('id', idCatEditando);
                if (error) { alert("Error al actualizar"); return; }
                idCatEditando = null;
                btnGuardarCat.textContent = "Crear Categoría";
            } else {
                const { error } = await window.supabaseClient.from('categorias').insert([{ nombre }]);
                if (error) { alert("Error al crear"); return; }
            }

            inputNombreCat.value = '';
            cargarCategorias();
        });

        async function guardarOActualizarProducto() {
            const nombre = inputs.nombre.value.trim();
            const precio = parseFloat(inputs.precio.value);
            const categoria_id = inputCategoria.value;
            const file = inputs.imagen.files[0];

            if (!nombre || isNaN(precio) || !categoria_id) {
                alert('Por favor, completa el nombre, precio y categoría.');
                return;
            }

            try {
                let publicUrl = null;

                if (file) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random()}.${fileExt}`;
                    const filePath = `images/${fileName}`;

                    const { error: uploadError } = await window.supabaseClient.storage
                        .from('productos')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data: urlData } = window.supabaseClient.storage
                        .from('productos')
                        .getPublicUrl(filePath);

                    publicUrl = urlData.publicUrl;
                }

                if (idProductoEditando) {
                    const datosActualizar = { nombre, precio, categoria_id };
                    if (publicUrl) datosActualizar.imagen_url = publicUrl;

                    const { error: updateError } = await window.supabaseClient
                        .from('productos')
                        .update(datosActualizar)
                        .eq('id', idProductoEditando);

                    if (updateError) throw updateError;
                    alert('¡Producto actualizado correctamente!');
                } else {
                    if (!file) {
                        alert('Selecciona una imagen para el nuevo producto.');
                        return;
                    }

                    const { error: dbError } = await window.supabaseClient
                        .from('productos')
                        .insert([{ nombre, precio, categoria_id, imagen_url: publicUrl }]);

                    if (dbError) throw dbError;
                    alert('¡Producto guardado correctamente!');
                }

                cerrarModalProducto();
                cargarProductosDesdeSupabase();

            } catch (error) {
                console.error("Error:", error);
                alert("Hubo un error: " + error.message);
            }
        }

        async function confirmarEliminacion() {
            if (!idProductoEliminando) return;

            const { error } = await window.supabaseClient.from('productos').delete().eq('id', idProductoEliminando);

            if (error) {
                alert('Hubo un error al eliminar el producto.');
            } else {
                productos = productos.filter(p => p.id != idProductoEliminando);
                renderProductos();
            }

            modalEliminar.classList.remove('active');
            idProductoEliminando = null;
        }

        function abrirModalEditar(id) {
            const productoActual = productos.find(p => p.id == id);
            if (!productoActual) return;

            idProductoEditando = id;
            modalTitulo.textContent = 'Editar Producto';
            btnGuardar.textContent = 'Actualizar Producto';

            inputs.nombre.value = productoActual.nombre;
            inputs.precio.value = productoActual.precio;
            inputCategoria.value = productoActual.categoria_id || '';
            
            if (productoActual.imagen_url) {
                previewMini.src = productoActual.imagen_url;
                previewMini.classList.add('visible');
                btnLimpiarImagen.style.display = 'block';
            }

            modalProducto.classList.add('active');
        }

        function abrirModalNuevo() {
            idProductoEditando = null;
            modalTitulo.textContent = 'Nuevo Producto';
            btnGuardar.textContent = 'Guardar Producto';
            cerrarModalProducto();
            modalProducto.classList.add('active');
        }

        function renderProductos() {
            let productosFiltrados = productos;
            if (categoriaSeleccionada !== 'todos') {
                productosFiltrados = productos.filter(p => p.categoria_id === categoriaSeleccionada);
            }

            grid.innerHTML = productosFiltrados.length === 0 ? '<div class="empty-message">No hay productos en esta categoría.</div>' : '';
            
            productosFiltrados.forEach(prod => {
                const card = document.createElement('div');
                card.className = 'product-card';
                
                card.innerHTML = `
                    <div class="product-image">
                        <img src="${prod.imagen_url}" alt="${prod.nombre}" onerror="this.style.display='none'">
                    </div>
                    <div class="product-name">${prod.nombre}</div>
                    <div class="product-price">$${prod.precio}</div>
                    <div class="product-actions" style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
                        <button class="btn-editar" data-id="${prod.id}" style="background-color: #f0ad4e; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Editar</button>
                        <button class="btn-eliminar" data-id="${prod.id}" style="background-color: #d9534f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Eliminar</button>
                    </div>
                `;
                
                grid.appendChild(card);
            });

            document.querySelectorAll('.btn-eliminar').forEach(button => {
                button.addEventListener('click', (e) => {
                    idProductoEliminando = e.target.getAttribute('data-id');
                    modalEliminar.classList.add('active');
                });
            });

            document.querySelectorAll('.btn-editar').forEach(button => {
                button.addEventListener('click', (e) => abrirModalEditar(e.target.getAttribute('data-id')));
            });
        }

        function cerrarModalProducto() {
            modalProducto.classList.remove('active');
            idProductoEditando = null;
            Object.values(inputs).forEach(input => input.value = '');
            inputCategoria.value = '';
            previewMini.src = '';
            previewMini.classList.remove('visible');
            btnLimpiarImagen.style.display = 'none';
        }

        // ========== EVENTOS ==========
        document.getElementById('btnAbrirModalProducto').addEventListener('click', abrirModalNuevo);
        document.getElementById('btnCancelarProducto').addEventListener('click', cerrarModalProducto);
        document.getElementById('btnGuardarProducto').addEventListener('click', guardarOActualizarProducto);

        // Eventos Modal Gestionar Categorías
        document.getElementById('btnGestionarCategorias').addEventListener('click', () => {
            modalGestionCategorias.classList.add('active');
        });
        document.getElementById('btnCerrarGestionCat').addEventListener('click', () => {
            modalGestionCategorias.classList.remove('active');
            idCatEditando = null;
            inputNombreCat.value = '';
            btnGuardarCat.textContent = "Crear Categoría";
        });

        // Eventos Modal Eliminar Producto
        document.getElementById('btnCancelarEliminar').addEventListener('click', () => {
            modalEliminar.classList.remove('active');
            idProductoEliminando = null;
        });
        document.getElementById('btnConfirmarEliminar').addEventListener('click', confirmarEliminacion);

        inputs.imagen.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewMini.src = e.target.result;
                    previewMini.classList.add('visible');
                    btnLimpiarImagen.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        btnLimpiarImagen.addEventListener('click', () => {
            inputs.imagen.value = '';
            previewMini.src = '';
            previewMini.classList.remove('visible');
            btnLimpiarImagen.style.display = 'none';
        });

        cargarDatosIniciales();
    });
})();