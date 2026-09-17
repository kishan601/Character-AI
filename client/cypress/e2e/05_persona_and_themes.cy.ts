describe('Persona Customization & UI Theme Modes', () => {
  beforeEach(() => {
    cy.resetClientState();
    cy.mockApi();
    cy.visit('/chat/session-101');
  });

  it('renders persona selector and displays active persona badge', () => {
    cy.get('header').should('be.visible');
    cy.contains(/Default Explorer|Explorer/i).should('exist');
  });

  it('toggles zen mode to hide header and distraction-free chrome', () => {
    cy.get('button[title*="Zen"], [data-testid="zen-toggle"]').first().click({ force: true });
    // Verify header hides / fades out
    cy.get('header').should('have.class', 'opacity-0');

    // Clicking zen button or ESC restores chrome
    cy.get('body').type('{esc}');
  });
});
