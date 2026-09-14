/* ========================================
   MARMOLERÍA BENJAMIN — Confirm Dialog
   ======================================== */

import { Modal } from './modal.js';

/**
 * Show a confirmation dialog
 * @returns {Promise<boolean>}
 */
export function confirmDialog({
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  subMessage = '',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning' // 'warning' or 'danger'
} = {}) {
  return new Promise((resolve) => {
    const iconSvg = type === 'danger'
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>'
      : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

    const content = `
      <div class="confirm-icon ${type}">
        ${iconSvg}
      </div>
      <p class="confirm-text">${message}</p>
      ${subMessage ? `<p class="confirm-subtext">${subMessage}</p>` : ''}
    `;

    const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';

    const footer = `
      <button class="btn btn-secondary" id="confirm-cancel">${cancelText}</button>
      <button class="btn ${btnClass}" id="confirm-ok">${confirmText}</button>
    `;

    const modal = Modal.open({
      title,
      content,
      size: 'sm',
      footer,
      onClose: () => resolve(false)
    });

    modal.querySelector('#confirm-cancel').addEventListener('click', () => {
      Modal.close();
      resolve(false);
    });

    modal.querySelector('#confirm-ok').addEventListener('click', () => {
      Modal.close();
      resolve(true);
    });
  });
}
