// Constante para el saldo inicial
const INITIAL_BALANCE = 10000;

// Cargar usuarios existentes o inicializar lista vacía
function getUsers() {
    return JSON.parse(localStorage.getItem('casino_users')) || [];
}

// Guardar lista de usuarios
function saveUsers(users) {
    localStorage.setItem('casino_users', JSON.stringify(users));
}

// Registrar un nuevo usuario
function registerUser(username, email, password) {
    const users = getUsers();

    // Verificar si el correo o usuario ya existe
    const exists = users.some(u => u.email === email || u.username === username);
    if (exists) {
        return { success: false, message: 'El usuario o correo ya está registrado.' };
    }

    // Crear nuevo objeto de usuario con saldo inicial
    const newUser = {
        id: Date.now(),
        username: username,
        email: email,
        password: password, // Nota: En producción backend se debe encriptar
        balance: INITIAL_BALANCE,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    return { success: true, message: '¡Registro exitoso! Te hemos regalado $10,000 fichas iniciales.' };
}

// Iniciar Sesión
function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return { success: false, message: 'Credenciales incorrectas.' };
    }

    // Guardar la sesión activa
    localStorage.setItem('casino_active_user', JSON.stringify(user));
    return { success: true, user: user };
}

// Obtener el usuario activo actual
function getActiveUser() {
    return JSON.parse(localStorage.getItem('casino_active_user')) || null;
}

// Cerrar Sesión
function logoutUser() {
    localStorage.removeItem('casino_active_user');
    window.location.reload();
}

// Actualizar Saldo del Usuario Activo (Para cuando juegue)
function updateActiveUserBalance(amountToAddOrSubtract) {
    const activeUser = getActiveUser();
    if (!activeUser) return;

    // Actualizar en el usuario activo
    activeUser.balance += amountToAddOrSubtract;
    localStorage.setItem('casino_active_user', JSON.stringify(activeUser));

    // Actualizar en la lista general de usuarios
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === activeUser.id);
    if (userIndex !== -1) {
        users[userIndex].balance = activeUser.balance;
        saveUsers(users);
    }

    // Actualizar interfaz gráfica si existe el elemento en pantalla
    renderUserHeader();
}

// Mostrar nombre y saldo en el Navbar/Encabezado
function renderUserHeader() {
    const activeUser = getActiveUser();
    const userInfoContainer = document.getElementById('user-header-info');

    if (!userInfoContainer) return;

    if (activeUser) {
        userInfoContainer.innerHTML = `
            <span>Bienvenido, <strong>${activeUser.username}</strong></span> | 
            <span>Saldo: <strong style="color: #ffd700;">$${activeUser.balance.toLocaleString()}</strong> fichas</span>
            <button onclick="logoutUser()" style="margin-left: 10px;">Cerrar Sesión</button>
        `;
    } else {
        userInfoContainer.innerHTML = `<a href="#login">Iniciar Sesión</a> / <a href="#register">Registrarse</a>`;
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    renderUserHeader();
});