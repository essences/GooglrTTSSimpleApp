import {
  elements,
  confirmButtonDefaults,
  setPendingConfirmAction,
  resetPendingConfirmAction
} from './dom-elements.js';

function configureConfirmButton({ confirmText, variant } = {}) {
  const primaryButton = elements.confirmPrimaryButton;
  if (!primaryButton) return;

  primaryButton.textContent = confirmText || confirmButtonDefaults.confirmText;
  primaryButton.classList.remove('btn-danger');
  if (variant === 'danger') {
    primaryButton.classList.add('btn-danger');
  }
}

export function openConfirmDialog(message, onConfirm, options = {}) {
  const dialog = elements.confirmDialog;
  if (!dialog) return;

  const messageElement = dialog.querySelector('#confirm-message');
  if (messageElement) {
    messageElement.textContent = message;
  }

  setPendingConfirmAction(() => {
    onConfirm();
    resetPendingConfirmAction();
  });

  configureConfirmButton(options);

  dialog.style.display = 'flex';
}

export function closeConfirmDialog() {
  const dialog = elements.confirmDialog;
  if (!dialog) return;

  dialog.style.display = 'none';
  resetPendingConfirmAction();
  configureConfirmButton();
}
