describe('Chat Streaming & Conversation Flow', () => {
  const sessionId = 'session-101';

  beforeEach(() => {
    cy.resetClientState();
    cy.mockApi();

    // Mock specific session messages
    cy.intercept('GET', `/api/sessions/${sessionId}/messages`, {
      statusCode: 200,
      body: [
        {
          id: 'msg-1',
          sessionId,
          role: 'assistant',
          content: '*adjusts brass telescope with a gentle smile* Welcome to the observatory! What mystery shall we explore tonight?',
          createdAt: new Date().toISOString(),
        },
      ],
    }).as('getMessages');

    cy.visit(`/chat/${sessionId}`);
  });

  it('renders chat header, character details, and initial greeting bubble', () => {
    cy.get('[data-testid="chat-header"]').should('be.visible');
    cy.get('[data-testid="message-bubble"]').should('have.length.at.least', 1);
    cy.get('[data-testid="message-bubble"]').first().contains('telescope').should('be.visible');
  });

  it('allows user to type in input textarea and sends message on Enter', () => {
    cy.intercept('POST', `/api/sessions/${sessionId}/messages`, {
      statusCode: 200,
      body: {
        id: 'msg-user-1',
        sessionId,
        role: 'user',
        content: 'Tell me about the Andromeda galaxy.',
        createdAt: new Date().toISOString(),
      },
    }).as('postUserMessage');

    cy.get('[data-testid="chat-input"]').type('Tell me about the Andromeda galaxy.{enter}');
    cy.wait('@postUserMessage');

    cy.get('[data-testid="message-bubble"]')
      .last()
      .should('contain.text', 'Tell me about the Andromeda galaxy.');
  });

  it('displays ThinkingIndicator when awaiting response stream', () => {
    cy.intercept('POST', `/api/sessions/${sessionId}/stream`, (req) => {
      // Delay response to verify thinking indicator state
      req.reply((res) => {
        res.delay(1000);
        res.send('data: {"token": "Andromeda "}\n\n');
      });
    }).as('streamResponse');

    cy.get('[data-testid="chat-input"]').type('What is a quasar?{enter}');
    cy.get('[data-testid="thinking-indicator"]').should('exist');
  });

  it('enables stop generation button while stream is active', () => {
    cy.get('[data-testid="chat-input"]').type('Simulate stream abort{enter}');
    cy.get('[data-testid="stop-stream-btn"]').should('exist').click();
  });
});
