// Dados dos usuários iniciais
const users = {
    "erikslava": {
        password: "55676209-1",
        webhook: "https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2",
        isAdmin: false
    },
    "ynn": {
        password: "gabrielomned",
        webhook: "https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2",
        isAdmin: false
    },
    "erikAdmin": {
        password: "rasgada333",
        webhook: "https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2",
        isAdmin: true
    }
};

// Sistema de ban por camadas
const banLayers = [
    { attempts: 3, time: 1 * 60 * 1000 },      // 1 minuto
    { attempts: 4, time: 5 * 60 * 1000 },      // 5 minutos
    { attempts: 5, time: 10 * 60 * 1000 },     // 10 minutos
    { attempts: 6, time: 30 * 60 * 1000 },     // 30 minutos
    { attempts: 7, time: 60 * 60 * 1000 },     // 1 hora
    { attempts: 8, time: 24 * 60 * 60 * 1000 }, // 1 dia
    { attempts: 9, time: null }               // Ban permanente
];

// Armazenamento local
const STORAGE_KEY = 'chat_amigos_data';

function getStorage() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {
        loginAttempts: {},
        bans: {},
        users: users,
        requests: []
    };
}

function saveStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Função para enviar webhook
async function sendWebhook(webhookUrl, data) {
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error('Erro ao enviar webhook:', error);
    }
}

// Função para enviar informações do usuário
async function sendUserInfo(username, action, success = false) {
    const webhookUrl = "https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2";
    
    try {
        // Tentar obter IP (apenas para informação)
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        
        await sendWebhook(webhookUrl, {
            content: `👤 **${action}** - ${username}`,
            embeds: [{
                title: `Usuário: ${username}`,
                description: `${action} ${success ? '✅' : '❌'}`,
                color: success ? 3066993 : 15158332,
                timestamp: new Date().toISOString(),
                fields: [
                    {
                        name: 'IP',
                        value: ipData.ip || 'Não disponível'
                    },
                    {
                        name: 'User Agent',
                        value: navigator.userAgent.substring(0, 100) + '...'
                    },
                    {
                        name: 'Plataforma',
                        value: navigator.platform
                    }
                ]
            }]
        });
    } catch (error) {
        console.error('Erro ao enviar informações:', error);
    }
}

// Função para verificar se está banido
function isBanned(username) {
    const data = getStorage();
    const banInfo = data.bans[username];
    
    if (!banInfo) return false;
    
    if (banInfo.permanent) return true;
    
    if (banInfo.until > Date.now()) {
        return true;
    } else {
        // Ban expirado
        delete data.bans[username];
        saveStorage(data);
        return false;
    }
}

// Função para adicionar tentativa de login
function addLoginAttempt(username) {
    const data = getStorage();
    
    if (!data.loginAttempts[username]) {
        data.loginAttempts[username] = {
            count: 0,
            lastAttempt: null
        };
    }
    
    data.loginAttempts[username].count++;
    data.loginAttempts[username].lastAttempt = Date.now();
    
    // Verificar se deve banir
    const attempts = data.loginAttempts[username].count;
    for (const layer of banLayers) {
        if (attempts === layer.attempts) {
            if (layer.time === null) {
                // Ban permanente
                data.bans[username] = {
                    permanent: true,
                    bannedAt: Date.now()
                };
            } else {
                // Ban temporário
                data.bans[username] = {
                    permanent: false,
                    until: Date.now() + layer.time,
                    bannedAt: Date.now()
                };
            }
            break;
        }
    }
    
    saveStorage(data);
}

// Função para resetar tentativas
function resetLoginAttempts(username) {
    const data = getStorage();
    delete data.loginAttempts[username];
    delete data.bans[username];
    saveStorage(data);
}

// Função para obter tempo restante do ban
function getBanTimeRemaining(username) {
    const data = getStorage();
    const banInfo = data.bans[username];
    
    if (!banInfo) return null;
    
    if (banInfo.permanent) return 'permanent';
    
    const remaining = banInfo.until - Date.now();
    if (remaining <= 0) return null;
    
    return remaining;
}

// Função para formatar tempo
function formatTime(ms) {
    if (ms === 'permanent') return 'PERMANENTE';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} dia${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`;
}

// Gerar código de verificação
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const banMessage = document.getElementById('banMessage');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            
            // Verificar banimento
            if (isBanned(username)) {
                const remaining = getBanTimeRemaining(username);
                banMessage.innerHTML = `
                    <h3>🚫 CONTA BANIDA</h3>
                    <p>Você excedeu o número máximo de tentativas.</p>
                    ${remaining === 'permanent' ? 
                        '<p><strong>Banimento PERMANENTE</strong></p>' : 
                        `<p>Tempo restante: <strong>${formatTime(remaining)}</strong></p>`
                    }
                `;
                banMessage.style.display = 'block';
                errorMessage.style.display = 'none';
                
                await sendUserInfo(username, 'Tentativa de login (BANIDO)', false);
                return;
            }
            
            // Verificar credenciais
            const data = getStorage();
            const user = data.users[username];
            
            if (user && user.password === password) {
                // Resetar tentativas em caso de sucesso
                resetLoginAttempts(username);
                
                // Gerar código de verificação
                const verificationCode = generateVerificationCode();
                
                // Enviar código via webhook
                await sendWebhook(user.webhook, {
                    content: `🔐 **Código de Verificação**`,
                    embeds: [{
                        title: `Login: ${username}`,
                        description: `Use o código abaixo para completar o login:`,
                        color: 3066993,
                        fields: [
                            {
                                name: 'Código',
                                value: `**${verificationCode}**`
                            },
                            {
                                name: 'Validade',
                                value: '5 minutos'
                            }
                        ],
                        timestamp: new Date().toISOString()
                    }]
                });
                
                // Armazenar código temporariamente
                sessionStorage.setItem('verificationCode', verificationCode);
                sessionStorage.setItem('verificationUser', username);
                sessionStorage.setItem('verificationTime', Date.now().toString());
                
                // Redirecionar para verificação
                window.location.href = 'verification.html';
                
            } else {
                // Adicionar tentativa falha
                addLoginAttempt(username);
                
                // Mostrar mensagem de erro
                errorMessage.textContent = 'Usuário ou senha incorretos!';
                errorMessage.style.display = 'block';
                banMessage.style.display = 'none';
                
                // Enviar informação de tentativa falha
                await sendUserInfo(username, 'Tentativa de login FALHOU', false);
                
                // Verificar se foi banido após essa tentativa
                if (isBanned(username)) {
                    const remaining = getBanTimeRemaining(username);
                    banMessage.innerHTML = `
                        <h3>🚫 CONTA BANIDA</h3>
                        <p>Você excedeu o número máximo de tentativas.</p>
                        ${remaining === 'permanent' ? 
                            '<p><strong>Banimento PERMANENTE</strong></p>' : 
                            `<p>Tempo restante: <strong>${formatTime(remaining)}</strong></p>`
                        }
                    `;
                    banMessage.style.display = 'block';
                    errorMessage.style.display = 'none';
                }
            }
        });
    }
    
    // Toggle password visibility
    window.togglePassword = function() {
        const passwordInput = document.getElementById('password');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
        } else {
            passwordInput.type = 'password';
        }
    };
});
