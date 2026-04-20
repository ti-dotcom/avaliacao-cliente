// Soft Minimalism Login Form JavaScript - PRODUÇÃO CORRIGIDO

class SoftMinimalismLoginForm {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.submitButton = this.form.querySelector('.comfort-button');
        this.successMessage = document.getElementById('successMessage');
        this.rememberCheckbox = document.getElementById('remember');

        this.init();
    }

    init() {
        this.bindEvents();
        this.setupPasswordToggle();
        this.setupGentleEffects();
        this.loadRememberedUser(); // 🔥 carregamento automático
    }

    bindEvents() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        this.usernameInput.addEventListener('blur', () => this.validateUsername());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.usernameInput.addEventListener('input', () => this.clearError('username'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
    }

    setupPasswordToggle() {
        this.passwordToggle.addEventListener('click', () => {
            const type = this.passwordInput.type === 'password' ? 'text' : 'password';
            this.passwordInput.type = type;
            this.passwordToggle.classList.toggle('toggle-active', type === 'text');
        });
    }

    setupGentleEffects() {
        [this.usernameInput, this.passwordInput].forEach(input => {
            input.addEventListener('focus', (e) => {
                e.target.closest('.field-container')?.classList.add('focus');
            });
            input.addEventListener('blur', (e) => {
                e.target.closest('.field-container')?.classList.remove('focus');
            });
        });
    }

    // 🔥 NOVO: força comportamento de campo preenchido
    markAsFilled(input) {
        if (input.value && input.value.trim() !== '') {
            input.classList.add('filled');
        } else {
            input.classList.remove('filled');
        }
    }

    validateUsername() {
        if (!this.usernameInput.value.trim()) {
            this.showError('username', 'Por favor, insira seu usuário!');
            return false;
        }
        this.clearError('username');
        return true;
    }

    validatePassword() {
        const pwd = this.passwordInput.value;

        if (!pwd) {
            this.showError('password', 'Por favor, insira sua senha!');
            return false;
        }

        if (pwd.length < 3) {
            this.showError('password', 'Senha inválida!');
            return false;
        }

        this.clearError('password');
        return true;
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field}Error`);
        errorElement.style.display = 'none';
        errorElement.textContent = '';
    }

    // 🔥 NOVO: carregar dados salvos + corrigir label
    loadRememberedUser() {
        const rememberedUser = localStorage.getItem('rememberUser');
        const rememberedPass = localStorage.getItem('rememberPass');
        const rememberedChecked = localStorage.getItem('rememberChecked');

        if (rememberedChecked === 'true') {
            this.usernameInput.value = rememberedUser || '';
            this.passwordInput.value = rememberedPass || '';
            this.rememberCheckbox.checked = true;

            // 🔥 CORREÇÃO DO BUG DO LABEL
            this.markAsFilled(this.usernameInput);
            this.markAsFilled(this.passwordInput);

            // fallback extra (garantia total)
            this.usernameInput.dispatchEvent(new Event('input'));
            this.passwordInput.dispatchEvent(new Event('input'));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const validUsername = this.validateUsername();
        const validPassword = this.validatePassword();

        if (!validUsername || !validPassword) return;

        this.setLoading(true);

        try {

            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: this.usernameInput.value.trim(),
                    senha: this.passwordInput.value
                })
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                this.showError('password', data.message || 'Usuário ou senha inválidos');
                this.setLoading(false);
                return;
            }

            // 🔥 LÓGICA LEMBRAR-ME
            if (this.rememberCheckbox.checked) {
                localStorage.setItem('rememberUser', this.usernameInput.value.trim());
                localStorage.setItem('rememberPass', this.passwordInput.value);
                localStorage.setItem('rememberChecked', 'true');
            } else {
                localStorage.removeItem('rememberUser');
                localStorage.removeItem('rememberPass');
                localStorage.removeItem('rememberChecked');
            }

            localStorage.setItem('token', data.token);

            this.form.style.display = 'none';
            this.successMessage.classList.add("show");

            setTimeout(() => {
                window.location.href = '/gerencia.html';
            }, 1000);

        } catch (err) {
            this.showError('password', 'Erro ao conectar com o servidor.');
            this.setLoading(false);
        }
    }

    setLoading(loading) {

        if (loading) {
            this.submitButton.classList.add("loading");
            this.submitButton.disabled = true;
        } else {
            this.submitButton.classList.remove("loading");
            this.submitButton.disabled = false;
        }

    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SoftMinimalismLoginForm();
});