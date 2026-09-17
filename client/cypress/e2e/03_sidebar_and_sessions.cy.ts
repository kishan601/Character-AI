describe('Sidebar Navigation & Session Management', () => {
  beforeEach(() => {
    cy.resetClientState();
    cy.mockApi();
    cy.visit('/');
  });

  it('renders sidebar with conversation list on desktop viewport', () => {
    cy.viewport(1280, 800);
    cy.get('[data-testid="sidebar-container"]').should('be.visible');
    cy.get('[data-testid="session-row"]').should('have.length.at.least', 1);
  });

  it('allows user to collapse and expand the desktop sidebar', () => {
    cy.viewport(1280, 800);
    cy.get('[data-testid="sidebar-toggle-btn"]').should('be.visible').click();
    // Verify collapsed state
    cy.get('[data-testid="sidebar-container"]').should('have.class', 'w-0');

    // Toggle back open
    cy.get('[data-testid="sidebar-toggle-btn"]').click();
    cy.get('[data-testid="sidebar-container"]').should('not.have.class', 'w-0');
  });

  it('navigates to selected chat session when clicking a session row', () => {
    cy.viewport(1280, 800);
    cy.get('[data-testid="session-row"]').first().click();
    cy.url().should('include', '/chat/');
  });

  it('displays session delete confirmation dialog on trash icon click', () => {
    cy.viewport(1280, 800);
    cy.get('[data-testid="delete-session-btn"]').first().click({ force: true });
    cy.get('[data-testid="confirm-modal"]').should('be.visible');
    cy.get('[data-testid="cancel-delete-btn"]').click();
    cy.get('[data-testid="confirm-modal"]').should('not.exist');
  });
});
