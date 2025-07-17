/**
 * Sistema de Gerenciamento de Contas Pessoais - Utilitários Comuns
 * Funções utilitárias compartilhadas entre as versões desktop e mobile
 */

'use strict';

/**
 * Exibe uma notificação toast
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo de notificação (success, danger/error, warning, primary/info)
 * @param {string} estilo - Estilo da notificação (desktop ou mobile)
 */
function utilsExibirToast(mensagem, tipo = 'primary', estilo = 'desktop') {
  // Configurações padrão
  let config = {
    text: mensagem,
    duration: 3000,
    close: true,
    stopOnFocus: true
  };
  
  // Aplicar configurações específicas por estilo
  if (estilo === 'mobile') {
    config.gravity = "top";
    config.position = "center";
    config.backgroundColor = tipo === 'success' ? '#4cc9f0' : 
                            tipo === 'error' || tipo === 'danger' ? '#f72585' : 
                            tipo === 'warning' ? '#f8961e' : 
                            '#4361ee'; // info/primary (azul)
  } else {
    config.gravity = "bottom";
    config.position = "right";
    config.backgroundColor = tipo === 'success' ? 'var(--success)' : 
                            tipo === 'danger' || tipo === 'error' ? 'var(--danger)' : 
                            tipo === 'warning' ? 'var(--warning)' : 
                            'var(--primary)';
    config.className = `toast-${tipo === 'error' ? 'danger' : tipo === 'info' ? 'primary' : tipo}`;
  }
  
  Toastify(config).showToast();
}

// Expor a função para uso global, evitando conflitos de nome
window.utilsExibirToast = utilsExibirToast;
