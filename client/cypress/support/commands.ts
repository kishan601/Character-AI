/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Mocks common backend API routes (characters, personas, sessions).
       */
      mockApi(): Chainable<void>;

      /**
       * Selects a character card by name or data-testid.
       */
      selectCharacter(name: string): Chainable<void>;

      /**
       * Types and sends a chat message in the chat view.
       */
      sendChatMessage(message: string): Chainable<void>;

      /**
       * Clears localStorage and resets application state.
       */
      resetClientState(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('mockApi', () => {
  cy.intercept('GET', '/api/characters', { fixture: 'characters.json' }).as('getCharacters');
  cy.intercept('GET', '/api/personas', { fixture: 'personas.json' }).as('getPersonas');
  cy.intercept('GET', '/api/sessions', { fixture: 'sessions.json' }).as('getSessions');
});

Cypress.Commands.add('selectCharacter', (name: string) => {
  cy.get('[data-testid="character-card"]')
    .contains(name)
    .parents('[data-testid="character-card"]')
    .click();
});

Cypress.Commands.add('sendChatMessage', (message: string) => {
  cy.get('[data-testid="chat-input"]')
    .should('be.visible')
    .type(message);
  cy.get('[data-testid="send-btn"]').click();
});

Cypress.Commands.add('resetClientState', () => {
  cy.clearLocalStorage();
  cy.clearCookies();
});

export {};
