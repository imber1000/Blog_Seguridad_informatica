
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // DOM Elements
    const authButtons = document.getElementById('authButtons');
    const userSection = document.getElementById('userSection');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const logoutBtn = document.getElementById('logoutBtn');
    const createPostBtn = document.getElementById('createPostBtn');
    const postsContainer = document.getElementById('postsContainer');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const createPostForm = document.getElementById('createPostForm');
    const editPostForm = document.getElementById('editPostForm');
    const deletePostBtn = document.getElementById('deletePostBtn');
    const editPostDetailBtn = document.getElementById('editPostDetailBtn');
    const deletePostDetailBtn = document.getElementById('deletePostDetailBtn');
    const categoryLinks = document.querySelectorAll('[data-category]');

    // Modals
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    const createPostModal = new bootstrap.Modal(document.getElementById('createPostModal'));
    const editPostModal = new bootstrap.Modal(document.getElementById('editPostModal'));
    const postDetailModal = new bootstrap.Modal(document.getElementById('postDetailModal'));
    const aboutModal = new bootstrap.Modal(document.getElementById('aboutModal'));

    // State
    let currentUser = null;
    let currentCategory = null;
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    let users = JSON.parse(localStorage.getItem('users')) || [];

    // Configuración de ImgBB (reemplaza con tu API key)
    const IMGBB_API_KEY = '68b496e274378a3efbe96b85dca86ee2'; // Obtén tu key en https://imgbb.com/

    // Initialize the app
    init();

    function init() {
        checkAuthState();
        loadPosts();
        setupEventListeners();
    }

    function checkAuthState() {
        const loggedInUser = localStorage.getItem('loggedInUser');
        if (loggedInUser) {
            currentUser = JSON.parse(loggedInUser);
            authButtons.classList.add('d-none');
            userSection.classList.remove('d-none');
            usernameDisplay.textContent = currentUser.name;
        } else {
            currentUser = null;
            authButtons.classList.remove('d-none');
            userSection.classList.add('d-none');
        }
    }

    function setupEventListeners() {
        // Auth buttons
        logoutBtn.addEventListener('click', logout);
        createPostBtn.addEventListener('click', () => createPostModal.show());

        // Forms
        loginForm.addEventListener('submit', handleLogin);
        registerForm.addEventListener('submit', handleRegister);
        createPostForm.addEventListener('submit', handleCreatePost);
        editPostForm.addEventListener('submit', handleEditPost);
        deletePostBtn.addEventListener('click', handleDeletePost);

        // Post detail buttons
        editPostDetailBtn.addEventListener('click', () => {
            postDetailModal.hide();
            const postId = document.getElementById('postDetailModal').dataset.postId;
            openEditPostModal(postId);
        });

        deletePostDetailBtn.addEventListener('click', () => {
            postDetailModal.hide();
            const postId = document.getElementById('postDetailModal').dataset.postId;
            confirmDeletePost(postId);
        });

        // Category links
        categoryLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                currentCategory = link.dataset.category;
                loadPosts(currentCategory);
                document.querySelectorAll('.badge').forEach(badge => {
                    badge.classList.remove('bg-primary', 'text-white');
                    badge.classList.add('bg-light', 'text-dark');
                });
                link.classList.remove('bg-light', 'text-dark');
                link.classList.add('bg-primary', 'text-white');
            });
        });
    }

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            currentUser = user;
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            loginModal.hide();
            checkAuthState();
            loadPosts();
            showToast('success', '¡Bienvenido!', 'Has iniciado sesión correctamente.');
        } else {
            showToast('danger', 'Error', 'Email o contraseña incorrectos.');
        }
    }

    function handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (password !== confirmPassword) {
            showToast('danger', 'Error', 'Las contraseñas no coinciden.');
            return;
        }

        if (users.some(u => u.email === email)) {
            showToast('danger', 'Error', 'Este email ya está registrado.');
            return;
        }

        const newUser = {
            id: generateId(),
            name,
            email,
            password,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        registerModal.hide();
        showToast('success', '¡Registro exitoso!', 'Ahora puedes iniciar sesión.');
        document.getElementById('loginEmail').value = email;
        loginModal.show();
    }

    function logout() {
        localStorage.removeItem('loggedInUser');
        currentUser = null;
        checkAuthState();
        loadPosts();
        showToast('success', 'Sesión cerrada', 'Has cerrado sesión correctamente.');
    }

    async function handleCreatePost(e) {
        e.preventDefault();
        const title = document.getElementById('postTitle').value;
        const category = document.getElementById('postCategory').value;
        const content = document.getElementById('postContent').value;
        const imageInput = document.getElementById('postImage');
        
        let imageUrl = '';
        
        // Subir imagen a ImgBB si existe
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            // Validar tamaño y tipo de archivo
            if (file.size > maxSize) {
                showToast('danger', 'Archivo muy grande', 'La imagen no debe exceder los 5MB.');
                return;
            }
            
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                showToast('danger', 'Formato no soportado', 'Solo se aceptan imágenes JPG, PNG o WEBP.');
                return;
            }
            
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                // Mostrar indicador de carga
                const submitBtn = document.querySelector('#createPostForm [type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Subiendo imagen...';
                submitBtn.disabled = true;
                
                // Subir a ImgBB
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error('Error al subir la imagen');
                }
                
                imageUrl = data.data.url; // URL pública de la imagen
                
                // Restaurar botón
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                
            } catch (error) {
                console.error('Error subiendo imagen:', error);
                showToast('danger', 'Error', 'No se pudo subir la imagen. Intenta con una imagen más pequeña o vuelve a intentarlo.');
                
                // Restaurar botón
                const submitBtn = document.querySelector('#createPostForm [type="submit"]');
                submitBtn.innerHTML = 'Publicar';
                submitBtn.disabled = false;
                return;
            }
        }
        
        // Crear el post
        const newPost = {
            id: generateId(),
            title,
            category,
            content,
            imageUrl, // URL pública de ImgBB o vacía si no hay imagen
            authorId: currentUser.id,
            authorName: currentUser.name,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        posts.unshift(newPost);
        localStorage.setItem('posts', JSON.stringify(posts));
        createPostModal.hide();
        createPostForm.reset();
        loadPosts();
        showToast('success', 'Publicación creada', 'Tu post ha sido publicado con éxito.');
    }

    async function handleEditPost(e) {
        e.preventDefault();
        const postId = document.getElementById('editPostId').value;
        const title = document.getElementById('editPostTitle').value;
        const category = document.getElementById('editPostCategory').value;
        const content = document.getElementById('editPostContent').value;
        const imageInput = document.getElementById('editPostImage');
        
        const postIndex = posts.findIndex(p => p.id === postId);
        if (postIndex === -1) return;

        // Mantener la imagen existente a menos que se suba una nueva
        let imageUrl = posts[postIndex].imageUrl;
        
        // Subir nueva imagen si se seleccionó
        if (imageInput.files.length > 0) {
            const file = imageInput.files[0];
            const maxSize = 5 * 1024 * 1024; // 5MB
            
            // Validar tamaño y tipo de archivo
            if (file.size > maxSize) {
                showToast('danger', 'Archivo muy grande', 'La imagen no debe exceder los 5MB.');
                return;
            }
            
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                showToast('danger', 'Formato no soportado', 'Solo se aceptan imágenes JPG, PNG o WEBP.');
                return;
            }
            
            const formData = new FormData();
            formData.append('image', file);
            
            try {
                // Mostrar indicador de carga
                const submitBtn = document.querySelector('#editPostForm [type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Subiendo imagen...';
                submitBtn.disabled = true;
                
                // Subir a ImgBB
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error('Error al subir la imagen');
                }
                
                imageUrl = data.data.url; // Nueva URL pública
                
                // Restaurar botón
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                
            } catch (error) {
                console.error('Error subiendo imagen:', error);
                showToast('danger', 'Error', 'No se pudo actualizar la imagen. Intenta con una imagen más pequeña o vuelve a intentarlo.');
                
                // Restaurar botón
                const submitBtn = document.querySelector('#editPostForm [type="submit"]');
                submitBtn.innerHTML = 'Guardar Cambios';
                submitBtn.disabled = false;
                return;
            }
        }

        // Actualizar el post
        posts[postIndex] = {
            ...posts[postIndex],
            title,
            category,
            content,
            imageUrl,
            updatedAt: new Date().toISOString()
        };

        localStorage.setItem('posts', JSON.stringify(posts));
        editPostModal.hide();
        loadPosts();
        showToast('success', 'Publicación actualizada', 'Los cambios se han guardado correctamente.');
    }

    function handleDeletePost() {
        const postId = document.getElementById('editPostId').value;
        confirmDeletePost(postId);
    }

    function confirmDeletePost(postId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta publicación? Esta acción no se puede deshacer.')) {
            posts = posts.filter(p => p.id !== postId);
            localStorage.setItem('posts', JSON.stringify(posts));
            editPostModal.hide();
            loadPosts();
            showToast('success', 'Publicación eliminada', 'La publicación ha sido eliminada correctamente.');
        }
    }

    function openEditPostModal(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        document.getElementById('editPostId').value = post.id;
        document.getElementById('editPostTitle').value = post.title;
        document.getElementById('editPostCategory').value = post.category;
        document.getElementById('editPostContent').value = post.content;

        const currentImageContainer = document.getElementById('currentImageContainer');
        currentImageContainer.innerHTML = '';
        
        if (post.imageUrl) {
            const img = document.createElement('img');
            img.src = post.imageUrl;
            img.alt = 'Current post image';
            img.className = 'img-fluid rounded mb-2';
            img.style.maxHeight = '200px';
            
            const label = document.createElement('p');
            label.className = 'text-muted small mb-2';
            label.textContent = 'Imagen actual:';
            
            currentImageContainer.appendChild(label);
            currentImageContainer.appendChild(img);
        }

        editPostModal.show();
    }

    function loadPosts(category = null) {
        let filteredPosts = [...posts];
        
        if (category) {
            filteredPosts = filteredPosts.filter(post => post.category === category);
        }
        
        postsContainer.innerHTML = '';
        
        if (filteredPosts.length === 0) {
            const noPostsMessage = document.createElement('div');
            noPostsMessage.className = 'text-center py-5';
            noPostsMessage.innerHTML = `
                <i class="fas fa-blog fa-3x mb-3 text-muted"></i>
                <h4 class="text-muted">No hay publicaciones disponibles</h4>
                <p class="text-muted">${currentUser ? 'Crea la primera publicación' : 'Inicia sesión para crear publicaciones'}</p>
            `;
            postsContainer.appendChild(noPostsMessage);
            return;
        }
        
        filteredPosts.forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'card post-card mb-4 fade-in';
            postCard.innerHTML = `
                <div class="row g-0">
                    ${post.imageUrl ? `
                    <div class="col-md-4">
                        <img src="${post.imageUrl}" class="img-fluid rounded-start h-100" alt="${post.title}" style="object-fit: cover;">
                    </div>
                    ` : ''}
                    <div class="${post.imageUrl ? 'col-md-8' : 'col-12'}">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <h5 class="card-title">${post.title}</h5>
                                <span class="badge bg-${post.category}">${formatCategory(post.category)}</span>
                            </div>
                            <p class="card-text">${truncateText(post.content, 150)}</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <small class="text-muted">Publicado el ${formatDate(post.createdAt)} por ${post.authorName}</small>
                                <button class="btn btn-sm btn-outline-primary read-more-btn" data-post-id="${post.id}">
                                    Leer más <i class="fas fa-arrow-right ms-1"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            postsContainer.appendChild(postCard);
        });
        
        // Add event listeners to read more buttons
        document.querySelectorAll('.read-more-btn').forEach(btn => {
            btn.addEventListener('click', () => showPostDetail(btn.dataset.postId));
        });
    }

    function showPostDetail(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        document.getElementById('postDetailTitle').textContent = post.title;
        document.getElementById('postDetailCategory').textContent = formatCategory(post.category);
        document.getElementById('postDetailCategory').className = `badge bg-${post.category}`;
        document.getElementById('postDetailDate').textContent = `Publicado el ${formatDate(post.createdAt)}`;
        document.getElementById('postDetailAuthor').textContent = post.authorName;
        
        const postDetailImage = document.getElementById('postDetailImage');
        if (post.imageUrl) {
            postDetailImage.src = post.imageUrl;
            postDetailImage.classList.remove('d-none');
        } else {
            postDetailImage.classList.add('d-none');
        }
        
        document.getElementById('postDetailContent').innerHTML = `
            <div class="post-content">${formatPostContent(post.content)}</div>
        `;
        
        const postActions = document.getElementById('postActions');
        if (currentUser && currentUser.id === post.authorId) {
            postActions.classList.remove('d-none');
            document.getElementById('postDetailModal').dataset.postId = post.id;
        } else {
            postActions.classList.add('d-none');
        }
        
        postDetailModal.show();
    }

    // Helper functions
    function generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    function formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    }

    function formatCategory(category) {
        const categories = {
            'tendencias': 'Tendencias',
            'nuevas-tecnologias': 'Nuevas Tecnologías',
            'noticias-delitos': 'Noticias de Delitos',
            'tips': 'Tips',
            'software': 'Software',
            'hardware': 'Hardware'
        };
        return categories[category] || category;
    }

    function formatPostContent(content) {
        // Simple formatting - in a real app you might use a markdown parser
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
            .replace(/\n/g, '<br>') // line breaks
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>'); // links
    }

    function showToast(type, title, message) {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
            toastContainer.style.zIndex = '1100';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toastEl = document.createElement('div');
        toastEl.className = `toast show align-items-center text-white bg-${type} border-0`;
        toastEl.role = 'alert';
        toastEl.ariaLive = 'assertive';
        toastEl.ariaAtomic = 'true';
        toastEl.style.maxWidth = '100%';
        toastEl.style.width = '350px';
        
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <strong>${title}</strong><br>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toastEl);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 300);
        }, 5000);
        
        // Add click to dismiss
        toastEl.querySelector('.btn-close').addEventListener('click', () => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 300);
        });
    }
});