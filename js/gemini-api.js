/* JARVIS Gemini API Integration */

// This file handles communication with Google's Gemini API

// Create Gemini API manager
window.geminiAPI = {
    apiKey: 'AIzaSyC31UsvHYJQMpqFahpqX-t4yPCwdruL0h0',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    
    // Initialize with API key
    init: function(apiKey) {
      this.apiKey = apiKey;
      console.log('Gemini API initialized');
    },
    
    // Generate content using Gemini
    generateContent: async function(prompt, options = {}) {
      if (!this.apiKey) {
        console.error('Gemini API key not set');
        return { error: 'API key not configured' };
      }
      
      try {
        const url = `${this.apiEndpoint}?key=${this.apiKey}`;
        
        // Create system prompt for JARVIS persona
        const systemPrompt = `You are JARVIS, an AI assistant in a VR environment. Your responses should be concise and helpful.
        The user is using a virtual reality interface where they can create virtual screens, browse the web, and manage their workspace using voice commands.
        If the user wants to create a screen, include [CREATE_SCREEN] in your response.
        If the user wants to set up a workspace with multiple screens, include [CREATE_WORKSPACE] in your response.
        If the user wants to open remote desktop, include [OPEN_DESKTOP] in your response.
        Keep responses under 100 words as they will be displayed in VR.`;
        
        // Combine user prompt with system prompt
        const combinedPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
        
        // Create request body
        const requestBody = {
          contents: [
            {
              parts: [
                { text: combinedPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 200,
            topP: 0.95,
            topK: 40
          }
        };
        
        // Send request
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Gemini API error:', errorData);
          return { 
            error: errorData.error?.message || 'Error calling Gemini API',
            status: response.status
          };
        }
        
        // Parse response
        const data = await response.json();
        
        // Extract text from response
        let text = '';
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && data.candidates[0].content.parts) {
          text = data.candidates[0].content.parts
            .filter(part => part.text)
            .map(part => part.text)
            .join(' ');
        }
        
        // Process the response to remove system instructions
        text = this.cleanResponse(text);
        
        return { text };
      } catch (error) {
        console.error('Error calling Gemini API:', error);
        return { error: error.message };
      }
    },
    
    // Clean up response text
    cleanResponse: function(text) {
      // Remove any assistant/user prefixes
      text = text.replace(/^(Assistant|JARVIS):\s*/i, '');
      
      // Keep action tags like [CREATE_SCREEN]
      // But remove any other instructions or formatting
      return text;
    }
  };
  
  // Check for API key in URL parameters
  document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const apiKey = params.get('key');
    
    if (apiKey) {
      window.geminiAPI.init(apiKey);
      console.log('Gemini API key loaded from URL parameter');
      
      // Update voice controller
      const scene = document.querySelector('a-scene');
      if (scene && scene.components['voice-controller']) {
        scene.setAttribute('voice-controller', `apiKey: ${apiKey}`);
      }
    } else {
      console.log('No Gemini API key provided. Natural language processing will be limited.');
      
      // Show message to user
      const statusText = document.getElementById('status-text');
      if (statusText) {
        statusText.textContent = 'JARVIS Ready (Limited Mode - No API Key)';
      }
    }
  });