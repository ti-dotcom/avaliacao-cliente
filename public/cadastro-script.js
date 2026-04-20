document.addEventListener("DOMContentLoaded", async function () {

    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = "login-index.html";
        return;
    }

    let usuario;
    try {
        const payloadBase64 = token.split('.')[1];
        usuario = JSON.parse(atob(payloadBase64));
    } catch (e) {
        localStorage.removeItem('token');
        window.location.href = "login-index.html";
        return;
    }

    if (usuario.cargo !== 'admin') {
        alert("Acesso permitido apenas para administradores.");
        window.location.href = "gerencia.html";
        return;
    }

    configurarMenu();
    configurarLogout();

    await carregarLojas(token);

    configurarCadastro(token);
});


/* ================= MENU SIDEBAR ================= */

function configurarMenu(){

    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");

    if(!menuBtn || !sidebar || !overlay) return;

    menuBtn.addEventListener("click", function(){
        sidebar.classList.add("active");
        overlay.classList.add("active");
        menuBtn.style.display = "none";
    });

    overlay.addEventListener("click", function(){
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        menuBtn.style.display = "block";
    });
}


/* ================= LOGOUT ================= */

function configurarLogout(){
    const btnLogout = document.getElementById("btnLogout");

    if(btnLogout){
        btnLogout.addEventListener("click", function(e){
            e.preventDefault();
            localStorage.removeItem("token");
            window.location.href = "login-index.html";
        });
    }
}


/* ================= CARREGAR LOJAS ================= */

async function carregarLojas(token) {

    const lojaSelect = document.getElementById('loja');
    if(!lojaSelect) return;

    try {
        const res = await fetch('/lojas', {
            headers:{ 'Authorization':'Bearer '+token }
        });

        if(!res.ok) return;

        const lojas = await res.json();

        lojaSelect.innerHTML = '<option value="">Selecione uma loja</option>';

        lojas.forEach(loja => {
            const option = document.createElement('option');
            option.value = loja.id;
            option.textContent = loja.nome;
            lojaSelect.appendChild(option);
        });

    } catch (err) {
        console.error("Erro ao carregar lojas:", err);
    }
}


/* ================= CADASTRO ================= */

function configurarCadastro(token){

    const form = document.getElementById('cadastroForm');
    const successMessage = document.getElementById('successMessage');

    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const cargo = document.getElementById('cargo').value;
        const loja = document.getElementById('loja').value;

        if (!username || !password || !cargo) {
            alert("Preencha todos os campos obrigatórios.");
            return;
        }

        try {

            const res = await fetch('/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    username,
                    senha: password,
                    cargo,
                    loja_id: loja ? Number(loja) : null
                })
            });

            const data = await res.json();

            if (!res.ok) {
                alert(data.message || "Erro ao cadastrar.");
                return;
            }

            successMessage.style.display = 'block';
            form.reset();

        } catch (err) {
            console.error(err);
            alert("Erro ao conectar com servidor.");
        }
    });
}