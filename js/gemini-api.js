/* JARVIS Gemini API Integration */

// This file handles communication with Google's Gemini API

// Create Gemini API manager
window.geminiAPI = {
  apiKey: 'AIzaSyC31UsvHYJQMpqFahpqX-t4yPCwdruL0h0', // Default key from your request
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  
  // Initialize with API key
  init: function(apiKey) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
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
      
      // Create system prompt for JARVIS in VR
      const systemPrompt = `You are JARVIS, an AI assistant in a virtual reality interface for Meta Quest 3. Your responses should be concise and helpful.
      
      The user is using your VR interface where they can create virtual screens, browse the web, and manage their workspace using voice commands and hand gestures.
      
      Include these instructions in your response when relevant:
      - If the user wants to create a screen, include [CREATE_SCREEN] in your response.
      - If the user wants to set up a workspace with multiple screens, include [CREATE_WORKSPACE] in your response.
      - If the user wants to open remote desktop, include [OPEN_DESKTOP] in your response.
      - If the user wants to switch to lab environment mode, include [SWITCH_TO_LAB] in your response.
      - If the user wants to switch to AR passthrough mode, include [SWITCH_TO_AR] in your response.
      
      Keep responses short and useful for a VR environment. The user can have up to 10 virtual screens with multiple tabs in each.`;
      
      // Combine user prompt with system prompt
      const combinedPrompt = `${systemPrompt}\n\nUser: ${prompt}`;
      
      // Create request body with multimodal content
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
      
      // Add safety settings
      const safetySettings = [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ];
      
      requestBody.safetySettings = safetySettings;
      
      // Send request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      // Handle error responses
      if (!response.ok) {
        let errorData = { error: 'Error calling Gemini API' };
        try {
          errorData = await response.json();
        } catch (e) {
          // If can't parse JSON, use generic error with status
          errorData = { 
            error: `Error (${response.status}) calling Gemini API`,
            status: response.status
          };
        }
        
        console.error('Gemini API error:', errorData);
        return { 
          error: errorData.error?.message || errorData.error || 'Error calling Gemini API',
          status: response.status
        };
      }
      
      // Parse response
      const data = await response.json();
      
      // Extract text from response
      let text = '';
      
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && data.candidates[0].content.parts) {
        
        // Extract and join all text parts from the response
        text = data.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join('\n');
      }
      
      // Process the response to remove system instructions
      text = this.cleanResponse(text);
      
      return { text, raw: data };
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return { error: error.message || 'Unknown error when calling Gemini API' };
    }
  },
  
  // Handle audio input through Web Speech API and send to Gemini
  processAudioInput: async function(audioBlob) {
    // In a production app, you would send the audio to a speech-to-text API
    // For now, we'll rely on the Web Speech API in the voice controller
    return { error: 'Direct audio processing not implemented' };
  },
  
  // Clean up response text
  cleanResponse: function(text) {
    // Remove any assistant/user prefixes
    text = text.replace(/^(Assistant|JARVIS):\s*/i, '');
    
    // Keep action tags like [CREATE_SCREEN]
    return text;
  }
};

// Check for API key in URL parameters
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const apiKey = params.get('key') || 'AIzaSyC31UsvHYJQMpqFahpqX-t4yPCwdruL0h0'; // Use default if not provided
  
  // Initialize API with the key
  window.geminiAPI.init(apiKey);
  console.log('Gemini API initialized');
  
  // Update voice controller
  const scene = document.querySelector('a-scene');
  if (scene) {
    // Wait for components to initialize
    setTimeout(() => {
      if (scene.components['voice-controller']) {
        scene.setAttribute('voice-controller', `apiKey: ${apiKey}`);
      }
    }, 1000);
  }
});