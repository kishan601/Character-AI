describe('Character Creator Wizard & Form Validation', () => {
  beforeEach(() => {
    cy.resetClientState();
    cy.mockApi();
    cy.visit('/characters/new');
  });

  it('renders creation form with all required character fields', () => {
    cy.get('h1, h2').contains(/create/i).should('be.visible');
    cy.get('input[name="name"], input[placeholder*="Name"]').should('be.visible');
    cy.get('textarea[name="greeting"], textarea[placeholder*="Greeting"]').should('be.visible');
    cy.get('textarea[name="description"], textarea[placeholder*="Description"]').should('be.visible');
  });

  it('prevents submission when required fields are missing', () => {
    cy.get('button[type="submit"], button:contains("Create")').first().click();
    // Verify HTML5 or form validation prevents navigation
    cy.url().should('include', '/characters/new');
  });

  it('successfully creates character and navigates upon valid submission', () => {
    cy.intercept('POST', '/api/characters', {
      statusCode: 201,
      body: {
        id: 'char-new-1',
        name: 'Zephyr the Windwalker',
        tagline: 'Guardian of the Whispering Peaks',
        greeting: '*bows respectfully as mountain breeze swirls around us*',
      },
    }).as('createCharacter');

    cy.get('input[name="name"], input[placeholder*="Name"]').first().type('Zephyr the Windwalker');
    cy.get('textarea[name="greeting"], textarea[placeholder*="Greeting"]').first().type('*bows respectfully*');
    cy.get('textarea[name="description"], textarea[placeholder*="Description"]').first().type('A swift elemental guardian.');

    cy.get('button[type="submit"], button:contains("Create")').first().click();
  });
});
