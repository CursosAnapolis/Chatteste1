// Função para carregar usuários
function loadUsers() {
    const data = getStorage();
    const usersList = document.getElementById('usersList');
    
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    for (const [username, userData] of Object.entries(data.users)) {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
            <div class="user-info">
                <strong>${username}</strong>
                <div style="font-size: 0.9em; color: #ff9999;">
                    ${userData.isAdmin ? '👑 Administrador' : '👤 Usuário'}
                </div>
                <div style="font-size: 0.8em; color: #cc6666;">
                    Webhook: ${userData.webhook.substring(0, 50)}...
                </div>
            </div>
            <div class="user-actions">
                <button class="btn-small" onclick="editUser('${username}')">Editar</button>
                ${username !== 'erikAdmin' ? 
                    `<button class="btn-small" onclick="deleteUser('${username}')">Excluir</button>` : 
                    ''
                }
            </div>
        `;
        usersList.appendChild(userItem);
    }
}

// Função para carregar solicitações
function loadRequests() {
    const data = getStorage();
    const requestsList = document.getElementById('requestsList');
    
    if (!requestsList) return;
    
    requestsList.innerHTML = '';
    
    if (!data.requests || data.requests.length === 0) {
        requestsList.innerHTML = '<p style="text-align: center; color: #ff9999;">Nenhuma solicitação pendente.</p>';
        return;
    }
    
    data.requests.forEach((request, index) => {
        const requestItem = document.createElement('div');
        requestItem.className = 'request-item';
        requestItem.innerHTML = `
            <div class="request-info">
                <strong>${request.name}</strong>
                <div style="font-size: 0.9em; color: #ff9999;">
                    Contato: ${request.contact}
                </div>
                <div style="font-size: 0.9em; color: #cc6666;">
                    Usuário desejado: ${request.desiredUsername}
                </div>
                <div style="font-size: 0.8em; color: #ff6666;">
                    ${new Date(request.timestamp).toLocaleString()}
                </div>
            </div>
            <div class="request-actions">
                <button class="btn-small" onclick="approveRequest(${index})">Aprovar</button>
                <button class="btn-small" onclick="rejectRequest(${index})">Rejeitar</button>
            </div>
        `;
        requestsList.appendChild(requestItem);
    });
}

// Função para carregar bans
function loadBans() {
    const data = getStorage();
    const bansList = document.getElementById('bansList');
    
    if (!bansList) return;
    
    bansList.innerHTML = '';
    
    if (!data.bans || Object.keys(data.bans).length === 0) {
        bansList.innerHTML = '<p style="text-align: center; color: #ff9999;">Nenhum usuário banido.</p>';
        return;
    }
    
    for (const [username, banInfo] of Object.entries(data.bans)) {
        const banItem = document.createElement('div');
        banItem.className = 'user-item';
        
        let banStatus = '';
        if (banInfo.permanent) {
            banStatus = 'PERMANENTE';
        } else {
            const remaining = banInfo.until - Date.now();
            if (remaining > 0) {
                banStatus = `Expira em: ${formatTime(remaining)}`;
            } else {
                banStatus = 'EXPIRADO';
            }
        }
        
        banItem.innerHTML = `
            <div class="user-info">
                <strong>${username}</strong>
                <div style="font-size: 0.9em; color: #ff9999;">
                    ${banStatus}
                </div>
                <div style="font-size: 0.8em; color: #cc6666;">
                    Banido em: ${new Date(banInfo.bannedAt).toLocaleString()}
                </div>
            </div>
            <div class="user-actions">
                <button class="btn-small" onclick="unbanUser('${username}')">Remover Ban</button>
            </div>
        `;
        bansList.appendChild(banItem);
    }
}

// Função para adicionar usuário
document.addEventListener('DOMContentLoaded', function() {
    const addUserForm = document.getElementById('addUserForm');
    
    if (addUserForm) {
        addUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('newUsername').value.trim();
            const password = document.getElementById('newPassword').value;
            const webhook = document.getElementById('newWebhook').value;
            const isAdmin = document.getElementById('isAdmin').checked;
            
            const data = getStorage();
            
            if (data.users[username]) {
                document.getElementById('addUserMessage').textContent = 'Usuário já existe!';
                document.getElementById('addUserMessage').style.display = 'block';
                return;
            }
            
            // Adicionar novo usuário
            data.users[username] = {
                password: password,
                webhook: webhook,
                isAdmin: isAdmin
            };
            
            saveStorage(data);
            
            // Enviar notificação
            await sendWebhook("https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2", {
                content: `👤 **NOVO USUÁRIO ADICIONADO**`,
                embeds: [{
                    title: `Usuário: ${username}`,
                    description: `Novo usuário adicionado pelo administrador`,
                    color: 3066993,
                    fields: [
                        {
                            name: 'Tipo',
                            value: isAdmin ? 'Administrador' : 'Usuário'
                        },
                        {
                            name: 'Webhook',
                            value: webhook.substring(0, 100) + '...'
                        }
                    ],
                    timestamp: new Date().toISOString()
                }]
            });
            
            // Limpar formulário e mostrar mensagem
            addUserForm.reset();
            document.getElementById('addUserMessage').textContent = '✅ Usuário adicionado com sucesso!';
            document.getElementById('addUserMessage').style.color = '#99ff99';
            document.getElementById('addUserMessage').style.display = 'block';
            
            // Atualizar lista
            loadUsers();
            
            setTimeout(() => {
                document.getElementById('addUserMessage').style.display = 'none';
            }, 3000);
        });
    }
});

// Função para aprovar solicitação
async function approveRequest(index) {
    const data = getStorage();
    const request = data.requests[index];
    
    // Adicionar como usuário
    data.users[request.desiredUsername] = {
        password: request.desiredPassword,
        webhook: request.webhook || "https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2",
        isAdmin: false
    };
    
    // Remover solicitação
    data.requests.splice(index, 1);
    
    saveStorage(data);
    
    // Enviar notificação
    await sendWebhook("https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2", {
        content: `✅ **SOLICITAÇÃO APROVADA**`,
        embeds: [{
            title: `Usuário: ${request.desiredUsername}`,
            description: `Solicitação de ${request.name} foi APROVADA`,
            color: 3066993,
            fields: [
                {
                    name: 'Contato',
                    value: request.contact
                },
                {
                    name: 'Motivo',
                    value: request.reason.substring(0, 100) + '...'
                }
            ],
            timestamp: new Date().toISOString()
        }]
    });
    
    // Atualizar listas
    loadUsers();
    loadRequests();
}

// Função para rejeitar solicitação
async function rejectRequest(index) {
    const data = getStorage();
    const request = data.requests[index];
    
    // Remover solicitação
    data.requests.splice(index, 1);
    
    saveStorage(data);
    
    // Enviar notificação
    await sendWebhook("https://discord.com/api/webhooks/1429236562134302781/9aDDtdDEO18AtU_Z7s08oRx9vjwhaez9shQWO6P3Ycf0ljNPM5iEitEd1f_8p8Opj-o2", {
        content: `❌ **SOLICITAÇÃO REJEITADA**`,
        embeds: [{
            title: `Usuário: ${request.desiredUsername}`,
            description: `Solicitação de ${request.name} foi REJEITADA`,
            color: 15158332,
            fields: [
                {
                    name: 'Contato',
                    value: request.contact
                },
                {
                    name: 'Motivo',
                    value: request.reason.substring(0, 100) + '...'
                }
            ],
            timestamp: new Date().toISOString()
        }]
    });
    
    // Atualizar lista
    loadRequests();
}

// Função para editar usuário
function editUser(username) {
    const data = getStorage();
    const user = data.users[username];
    
    const newPassword = prompt(`Nova senha para ${username}:`, user.password);
    if (newPassword === null) return;
    
    const newWebhook = prompt(`Novo webhook para ${username}:`, user.webhook);
    if (newWebhook === null) return;
    
    const newIsAdmin = confirm(`${username} é administrador?`);
    
    data.users[username] = {
        password: newPassword || user.password,
        webhook: newWebhook || user.webhook,
        isAdmin: newIsAdmin
    };
    
    saveStorage(data);
    loadUsers();
    
    sendUserInfo(username, 'Usuário EDITADO pelo admin', true);
}

// Função para excluir usuário
function deleteUser(username) {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${username}?`)) return;
    
    const data = getStorage();
    delete data.users[username];
    saveStorage(data);
    loadUsers();
    
    sendUserInfo(username, 'Usuário EXCLUÍDO pelo admin', false);
}

// Função para remover ban
function unbanUser(username) {
    const data = getStorage();
    delete data.bans[username];
    delete data.loginAttempts[username];
    saveStorage(data);
    loadBans();
}
