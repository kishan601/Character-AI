describe('Mobile Viewport & Touch Gestures (Capacitor WebView)', () => {
  beforeEach(() => {
    cy.viewport('iphone-x'); // 375 x 812
    cy.resetClientState();
    cy.mockApi();
    cy.visit('/');
  });

  it('renders mobile layout with responsive navbar and hidden desktop elements', () => {
    cy.get('header').should('be.visible');
    // Sidebar should be collapsed / hidden initially on mobile
    cy.get('[data-testid="sidebar-container"]').should('have.class', '-translate-x-full');
  });

  it('triggers pull-to-refresh touch drag gesture on homepage', () => {
    cy.get('main')
      .trigger('touchstart', { touches: [{ clientY: 150, clientX: 180 }] })
      .trigger('touchmove', { touches: [{ clientY: 230, clientX: 180 }] });

    cy.contains(/refresh/i).should('exist');

    cy.get('main').trigger('touchend');
  });

  it('verifies back button appears on mobile chat screen and navigates to home', () => {
    cy.visit('/chat/session-101');
    cy.get('header button[title*="Back"], header button:has(svg.lucide-arrow-left)')
      .should('be.visible')
      .click();

    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });
});
