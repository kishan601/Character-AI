// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
// ***********************************************************

import './commands';

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err) => {
  // Ignore ResizeObserver loop limit exceeded errors
  if (err.message.includes('ResizeObserver loop completed with undelivered notifications') ||
      err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});
