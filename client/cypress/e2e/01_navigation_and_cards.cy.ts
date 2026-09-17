describe('Home Navigation & Character Discovery', () => {
  beforeEach(() => {
    cy.resetClientState();
    cy.mockApi();
    cy.visit('/');
  });

  it('renders the application shell and character grid properly', () => {
    cy.get('header').should('be.visible');
    cy.get('[data-testid="search-input"]').should('exist');
    cy.get('[data-testid="character-grid"]')
      .should('be.visible')
      .children()
      .should('have.length.at.least', 1);
  });

  it('filters character cards dynamically when user types in search', () => {
    cy.get('[data-testid="search-input"]').type('Marcus');
    cy.get('[data-testid="character-card"]').should('have.length', 1);
    cy.get('[data-testid="character-card"]').contains('Marcus Vance').should('be.visible');

    // Clearing search restores all characters
    cy.get('[data-testid="search-input"]').clear();
    cy.get('[data-testid="character-card"]').should('have.length.at.least', 2);
  });

  it('filters characters accurately when clicking category tag chips', () => {
    cy.contains('button, [role="button"]', 'Cyberpunk').click();
    cy.get('[data-testid="character-card"]').each(($card) => {
      cy.wrap($card).should('contain.text', 'Marcus Vance');
    });
  });

  it('navigates directly to character chat when clicking a card', () => {
    cy.intercept('POST', '/api/sessions/**', {
      statusCode: 200,
      body: { id: 'session-test-1', characterId: 'char-1' },
    }).as('startSession');

    cy.get('[data-testid="character-card"]').first().click();
    cy.url().should('include', '/chat/');
  });
});
