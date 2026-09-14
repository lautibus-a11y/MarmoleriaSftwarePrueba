/* =========================================================
   MARMOLERÍA BENJAMIN — Document Preview & Export Modal
   ========================================================= */

import { Icons } from './ui.js';
import { exportToPdf, exportToWord, printDocument } from '../services/documentExporter.js';
import { Toast } from './toast.js';

let modalEl = null;

export const DocumentModal = {
  open({ title = 'Vista previa de documento', filename = 'documento', htmlContent = '' }) {
    this.close();

    modalEl = document.createElement('div');
    modalEl.className = 'doc-modal-overlay';
    modalEl.id = 'doc-preview-modal';

    modalEl.innerHTML = `
      <div class="doc-modal-container">
        <div class="doc-modal-toolbar">
          <div class="doc-modal-toolbar-top">
            <div class="doc-modal-toolbar-title">
              ${Icons['file-text']}
              <span>${title}</span>
            </div>
            <button class="btn btn-ghost btn-icon btn-sm" id="btn-doc-modal-close" title="Cerrar vista previa" aria-label="Cerrar">
              ${Icons.x}
            </button>
          </div>
          <div class="doc-modal-toolbar-actions">
            <button class="btn btn-pdf btn-sm" id="btn-doc-modal-pdf">
              ${Icons['file-pdf']} <span>PDF</span>
            </button>
            <button class="btn btn-word btn-sm" id="btn-doc-modal-word">
              ${Icons['file-word']} <span>Word (.doc)</span>
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-doc-modal-print">
              ${Icons.printer} <span>Imprimir</span>
            </button>
          </div>
        </div>

        <div class="doc-sheet-wrapper">
          <div id="doc-sheet-content">
            ${htmlContent}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);
    document.body.classList.add('doc-modal-open');

    // Fade in
    requestAnimationFrame(() => {
      modalEl.classList.add('active');
    });

    // Event listeners
    const sheetEl = modalEl.querySelector('#doc-sheet-content');

    // PDF button
    modalEl.querySelector('#btn-doc-modal-pdf')?.addEventListener('click', async () => {
      Toast.info('Generando PDF', 'Preparando documento en alta resolución...');
      const success = await exportToPdf(sheetEl, filename);
      if (success) {
        Toast.success('PDF descargado con éxito');
      }
    });

    // Word button
    modalEl.querySelector('#btn-doc-modal-word')?.addEventListener('click', () => {
      try {
        exportToWord(sheetEl.innerHTML, filename);
        Toast.success('Documento Word (.doc) generado y descargado');
      } catch (err) {
        console.error(err);
        Toast.error('Error al generar archivo Word');
      }
    });

    // Print button
    modalEl.querySelector('#btn-doc-modal-print')?.addEventListener('click', () => {
      printDocument(sheetEl.innerHTML);
    });

    // Close button
    modalEl.querySelector('#btn-doc-modal-close')?.addEventListener('click', () => {
      this.close();
    });

    // Close on backdrop click
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) {
        this.close();
      }
    });

    // Close on Escape key
    this._handleKeyDown = (e) => {
      if (e.key === 'Escape') this.close();
    };
    window.addEventListener('keydown', this._handleKeyDown);
  },

  close() {
    if (modalEl && modalEl.parentNode) {
      modalEl.classList.remove('active');
      document.body.classList.remove('doc-modal-open');
      window.removeEventListener('keydown', this._handleKeyDown);
      setTimeout(() => {
        if (modalEl && modalEl.parentNode) {
          modalEl.parentNode.removeChild(modalEl);
        }
        modalEl = null;
      }, 200);
    }
  }
};
