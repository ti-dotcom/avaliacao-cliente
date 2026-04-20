let usuarioEditando = null;
let adminIdGlobal = null;

document.addEventListener("DOMContentLoaded", async function(){

    const token = localStorage.getItem('token');
    if(!token){
        window.location.href="login-index.html";
        return;
    }

    let payload;
    try{
        payload = JSON.parse(atob(token.split('.')[1]));
    }catch(e){
        localStorage.removeItem("token");
        window.location.href="login-index.html";
        return;
    }

    if(payload.cargo !== 'admin'){
        alert("Acesso permitido apenas para administradores.");
        window.location.href="gerencia.html";
        return;
    }

    adminIdGlobal = payload.id;

    configurarMenu();
    configurarModal();
    configurarLogout();   // ⭐ ADICIONADO

    await carregarLojas(token);
    await carregarUsuarios(token);
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

    if(!btnLogout) return;

    btnLogout.addEventListener("click", function(e){

        e.preventDefault();

        localStorage.removeItem("token");

        window.location.href = "login-index.html";
    });

}


/* ================= CONFIGURAR MODAL ================= */

function configurarModal(){

    const modal = document.getElementById("modalEditar");
    const btnFechar = document.getElementById("fecharModal");
    const btnSalvar = document.getElementById("salvarAlteracao");

    if(!modal || !btnFechar || !btnSalvar) return;

    btnFechar.addEventListener("click", fecharModal);
    btnSalvar.addEventListener("click", salvarAlteracao);

    modal.addEventListener("click", function(e){
        if(e.target === modal){
            fecharModal();
        }
    });
}

function abrirModal(usuario){

    usuarioEditando = usuario.id;

    document.getElementById("editarUsername").value = usuario.username;
    document.getElementById("editarSenha").value = "";
    document.getElementById("editarCargo").value = usuario.cargo;
    document.getElementById("editarLoja").value = usuario.loja_id || "";

    document.getElementById("modalEditar").classList.add("active");
}

function fecharModal(){
    document.getElementById("modalEditar").classList.remove("active");
}


/* ================= CARREGAR LOJAS ================= */

async function carregarLojas(token){

    try{
        const res = await fetch('/lojas',{
            headers:{'Authorization':'Bearer '+token}
        });

        if(!res.ok) return;

        const lojas = await res.json();
        const select = document.getElementById("editarLoja");

        if(!select) return;

        select.innerHTML = '<option value="">Selecione a filial</option>';

        lojas.forEach(l=>{
            const option = document.createElement("option");
            option.value = l.id;
            option.textContent = l.nome;
            select.appendChild(option);
        });

    }catch(err){
        console.error("Erro ao carregar lojas:", err);
    }
}


/* ================= CARREGAR USUÁRIOS ================= */

async function carregarUsuarios(token){

    try{

        const res = await fetch('/usuarios',{
            headers:{'Authorization':'Bearer '+token}
        });

        if(!res.ok){
            alert("Erro ao carregar usuários.");
            return;
        }

        const usuarios = await res.json();
        const tabela = document.getElementById('tabelaUsuarios');

        if(!tabela) return;

        tabela.innerHTML='';

        usuarios.forEach(u=>{

            const tr = document.createElement('tr');

            tr.innerHTML=`
                <td>${u.id}</td>
                <td>${u.username}</td>
                <td>${u.cargo}</td>
                <td>${u.loja || '-'}</td>
                <td></td>
            `;

            const tdAcoes = tr.querySelector("td:last-child");

            if(u.id !== adminIdGlobal){

                const btnEditar = document.createElement("button");
                btnEditar.textContent = "Alterar";
                btnEditar.className = "btnEditar";
                btnEditar.onclick = ()=>abrirModal(u);

                const btnExcluir = document.createElement("button");
                btnExcluir.textContent = "Excluir";
                btnExcluir.className = "btnExcluir";
                btnExcluir.onclick = ()=>excluir(u.id);

                tdAcoes.appendChild(btnEditar);
                tdAcoes.appendChild(btnExcluir);

            }else{
                tdAcoes.textContent = "---";
            }

            tabela.appendChild(tr);
        });

    }catch(err){
        console.error("Erro ao carregar usuários:", err);
    }
}


/* ================= SALVAR ALTERAÇÃO ================= */

async function salvarAlteracao(){

    const token = localStorage.getItem('token');

    const username = document.getElementById("editarUsername").value.trim();
    const senha = document.getElementById("editarSenha").value;
    const cargo = document.getElementById("editarCargo").value;
    const loja_id = document.getElementById("editarLoja").value;

    if(!username){
        alert("Usuário é obrigatório.");
        return;
    }

    try{

        const res = await fetch('/usuarios/'+usuarioEditando,{
            method:'PUT',
            headers:{
                'Content-Type':'application/json',
                'Authorization':'Bearer '+token
            },
            body:JSON.stringify({
                username,
                senha,
                cargo,
                loja_id
            })
        });

        const data = await res.json();

        if(!res.ok){
            alert(data.message || "Erro ao atualizar.");
            return;
        }

        alert("Usuário atualizado com sucesso!");
        fecharModal();
        carregarUsuarios(token);

    }catch(err){
        console.error("Erro ao atualizar:", err);
        alert("Erro na atualização.");
    }
}


/* ================= EXCLUIR ================= */

async function excluir(id){

    if(!confirm("Deseja excluir este usuário?")) return;

    const token = localStorage.getItem('token');

    try{

        const res = await fetch('/usuarios/'+id,{
            method:'DELETE',
            headers:{'Authorization':'Bearer '+token}
        });

        if(!res.ok){
            alert("Erro ao excluir.");
            return;
        }

        alert("Usuário excluído!");
        carregarUsuarios(token);

    }catch(err){
        console.error("Erro ao excluir:", err);
    }
}