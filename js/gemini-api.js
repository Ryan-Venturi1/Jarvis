/* JARVIS Enhanced Voice Controller with Gemini Integration */

// A-Frame component for voice recognition and commands with Gemini API
AFRAME.registerComponent('voice-controller', {
  schema: {
    autoStart: {type: 'boolean', default: false},
    listenKey: {type: 'string', default: 'Space'},
    wakeWords: {type: 'array', default: ['jarvis', 'hey jarvis', 'yo jarvis', 'hi jarvis']},
    apiKey: {type: 'string', default: 'AIzaSyC31UsvHYJQMpqFahpqX-t4yPCwdruL0h0'},
    responseVolume: {type: 'number', default: 1.0},
    responsePitch: {type: 'number', default: 1.0},
    responseRate: {type: 'number', default: 1.0}
  },
  
  init: function() {
    this.isListening = false;
    this.recognition = null;
    this.utterance = null;
    this.voiceIndicator = document.getElementById('voice-indicator');
    this.responseText = document.getElementById('response-text');
    this.listenButton = document.getElementById('listen-button');
    this.wakeWordDetected = false;
    this.processingCommand = false;
    this.commandHistory = [];
    this.lastCommandTime = 0;
    
    // Bind methods
    this.toggleListening = this.toggleListening.bind(this);
    this.processCommand = this.processCommand.bind(this);
    this.onSpeechResult = this.onSpeechResult.bind(this);
    this.startListening = this.startListening.bind(this);
    this.stopListening = this.stopListening.bind(this);
    
    // Initialize Gemini API
    this.initGeminiAPI();
    
    // Set up UI event listeners
    this.setupUIListeners();
    
    // Setup speech recognition if available
    this.setupSpeechRecognition();
    
    // Setup speech synthesis
    this.setupSpeechSynthesis();
    
    // Auto-start if configured
    if (this.data.autoStart) {
      setTimeout(() => {
        this.speak("JARVIS system online. Ready for commands.");
        this.startListening();
      }, 2000);
    }
    
    console.log('JARVIS Voice Controller initialized with Gemini integration');
  },
  
  setupUIListeners: function() {
    // Set up button listener
    if (this.listenButton) {
      this.listenButton.addEventListener('click', this.toggleListening);
    }
    
    // Set up keyboard listener
    document.addEventListener('keydown', (e) => {
      if (e.code === this.data.listenKey && !this.isTypingInIframe()) {
        e.preventDefault();
        this.toggleListening();
      }
    });
    
    // Listen for hand gesture events to activate voice
    this.el.addEventListener('system-toggle', (event) => {
      // Toggle listening on snap gesture
      if (event.detail && event.detail.hand) {
        this.toggleListening();
      }
    });
  },
  
  isTypingInIframe: function() {
    // Prevent activation when typing in iframe
    return document.activeElement && 
           (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable);
  },
  
  initGeminiAPI: function() {
    // Initialize Gemini API with the provided key
    if (!window.geminiAPI) {
      window.geminiAPI = {
        apiKey: this.data.apiKey,
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        
        generateContent: async function(prompt, options = {}) {
          if (!this.apiKey) {
            console.error('Gemini API key not set');
            return { error: 'API key not configured' };
          }
          
          try {
            const url = `${this.apiEndpoint}?key=${this.apiKey}`;
            
            // Create system prompt for JARVIS in VR
            const systemPrompt = `You are JARVIS, Tony Stark's AI assistant in a virtual reality interface for Meta Quest 3. Your responses should be concise, helpful, and in the authentic style of Iron Man's JARVIS AI. Use "sir" or "Ms." appropriately when addressing the user in a British-accented professional manner.

            The user is working in a VR environment with the following capabilities:
            - Up to 10 virtual screens with multiple tabs each
            - Remote desktop connections to actual computers
            - Hand tracking with Iron Man-inspired gesture controls
            - Surface detection for placing keyboards on real-world surfaces
            - Environmental awareness with AR passthrough capabilities
            
            Include these action tags in your response when appropriate:
            - [CREATE_SCREEN] - Create a new virtual screen
            - [CREATE_WORKSPACE] - Set up a multi-screen workspace 
            - [OPEN_DESKTOP] - Open remote desktop connection
            - [SWITCH_TO_LAB] - Switch to Stark Industries lab environment
            - [SWITCH_TO_AR] - Switch to AR passthrough mode
            - [SCAN_SURFACES] - Scan for keyboard-compatible surfaces
            - [OPEN_APP:name] - Open a specific application on remote desktop
            - [ARRANGE_SCREENS] - Arrange screens in optimal layout
            
            Keep responses under 3 sentences for efficient VR interaction. Respond exactly as JARVIS would in the Iron Man films - professional, slightly witty, and unfailingly competent.`;
            
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
                temperature: 0.2, // Reduced for more consistent responses
                maxOutputTokens: 150, // Shorter responses for VR
                topP: 0.9,
                topK: 30
              },
              safetySettings: [
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
              ]
            };
            
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
        
        // Clean up response text
        cleanResponse: function(text) {
          // Remove any assistant/user prefixes
          text = text.replace(/^(Assistant|JARVIS):\s*/i, '');
          
          // Keep action tags like [CREATE_SCREEN]
          return text;
        }
      };
      
      // Initialize API with the key
      window.geminiAPI.apiKey = this.data.apiKey;
      console.log('Gemini API initialized with key:', this.data.apiKey.substring(0, 8) + '...');
    }
  },
  
  setupSpeechRecognition: function() {
    // Check for browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser');
      this.updateResponseText('Speech recognition not supported in your browser');
      return;
    }
    
    // Create speech recognition object
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure recognition for Meta Quest
    this.recognition.continuous = false;
    this.recognition.interimResults = true; // Enable interim results for better responsiveness
    this.recognition.lang = 'en-US';
    
    // Set up event handlers
    this.recognition.onresult = this.onSpeechResult;
    
    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateVoiceIndicator(true);
      this.updateResponseText(`Listening for "${this.data.wakeWords[0]}"...`);
      this.el.emit('voice-listening-started');
      console.log('Speech recognition started');
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // If wake word was detected or we're processing a command, don't restart automatically
      if (this.wakeWordDetected || this.processingCommand) {
        this.isListening = false;
        this.updateVoiceIndicator(false);
        
        // If we were just in wake word mode, start command mode
        if (this.wakeWordDetected && !this.processingCommand) {
          this.wakeWordDetected = false;
          this.processingCommand = true;
          setTimeout(() => this.startListening(), 300);
        }
      } else {
        // Otherwise keep listening for wake word
        setTimeout(() => {
          if (!this.wakeWordDetected && !this.processingCommand) {
            this.startListening();
          }
        }, 300);
      }
    };
    
    this.recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      this.updateResponseText(`Error: ${event.error}`);
      this.isListening = false;
      this.updateVoiceIndicator(false);
      
      // Restart listening after error (except for when no-speech)
      if (event.error !== 'no-speech') {
        setTimeout(() => this.startListening(), 2000);
      } else {
        setTimeout(() => this.startListening(), 500);
      }
    };
  },
  
  setupSpeechSynthesis: function() {
    // Setup speech synthesis
    if ('speechSynthesis' in window) {
      this.utterance = new SpeechSynthesisUtterance();
      this.utterance.lang = 'en-US';
      this.utterance.rate = this.data.responseRate;
      this.utterance.pitch = this.data.responsePitch;
      this.utterance.volume = this.data.responseVolume;
      
      // Use a slightly British male voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoices = ['Google UK English Male', 'Daniel', 'British Male'];
      
      const setVoice = () => {
        const voices = window.speechSynthesis.getVoices();
        for (const preferred of preferredVoices) {
          const voice = voices.find(v => v.name.includes(preferred));
          if (voice) {
            this.utterance.voice = voice;
            console.log(`Using ${voice.name} voice for JARVIS`);
            break;
          }
        }
      };
      
      if (voices.length) {
        setVoice();
      } else {
        window.speechSynthesis.addEventListener('voiceschanged', setVoice);
      }
      
      // Handle speech synthesis events
      this.utterance.onstart = () => {
        // Update UI to show speaking
        if (this.responseText) {
          this.responseText.classList.add('active');
        }
        
        this.el.emit('voice-speaking-started');
      };
      
      this.utterance.onend = () => {
        // Update UI to show done speaking
        if (this.responseText) {
          this.responseText.classList.remove('active');
        }
        
        this.el.emit('voice-speaking-ended');
        
        // If we just responded to a command, go back to listening for wake word
        if (this.processingCommand) {
          this.processingCommand = false;
          this.wakeWordDetected = false;
          setTimeout(() => this.startListening(), 500);
        }
      };
    }
  },
  
  startListening: function() {
    if (!this.recognition) {
      console.warn('Speech recognition not initialized');
      return;
    }
    
    try {
      this.recognition.start();
    } catch (e) {
      console.error('Error starting speech recognition', e);
      
      // If already started, stop and restart
      if (e.name === 'InvalidStateError') {
        this.recognition.stop();
        setTimeout(() => this.startListening(), 500);
      }
    }
  },
  
  stopListening: function() {
    if (!this.recognition) return;
    
    try {
      this.recognition.stop();
      this.isListening = false;
      this.updateVoiceIndicator(false);
    } catch (e) {
      console.error('Error stopping speech recognition', e);
    }
  },
  
  toggleListening: function() {
    if (this.isListening) {
      this.stopListening();
      this.updateResponseText('Listening paused');
    } else {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      
      this.wakeWordDetected = true; // Skip wake word detection when manually toggled
      this.processingCommand = true;
      this.startListening();
      this.updateResponseText('Listening...');
    }
  },
  
  onSpeechResult: function(event) {
    if (!event.results || !event.results.length) return;
    
    // Get latest result
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.toLowerCase().trim();
    
    // Display transcript for feedback
    this.updateResponseText(transcript);
    
    // Only process when we're reasonably confident
    if (result[0].confidence < 0.2 && !result.isFinal) return;
    
    // Check for wake word if not already detected
    if (!this.wakeWordDetected && !this.processingCommand) {
      // Check each wake word
      const detected = this.data.wakeWords.some(word => transcript.includes(word.toLowerCase()));
      
      if (detected) {
        this.wakeWordDetected = true;
        this.updateResponseText("Yes, sir?");
        this.speak("Yes, sir?");
        
        // Stop current recognition session to start command mode
        this.stopListening();
        return;
      } else {
        // Just show what's being heard without further action
        return;
      }
    }
    
    // Only process commands on final result when in command mode
    if (this.processingCommand && result.isFinal) {
      console.log('Final transcript:', transcript);
      
      // Don't process if too short or empty
      if (transcript.length < 2) {
        this.updateResponseText('Listening for command...');
        return;
      }
      
      // Remove wake word if present
      let command = transcript;
      this.data.wakeWords.forEach(word => {
        command = command.replace(word.toLowerCase(), "");
      });
      command = command.trim();
      
      if (command) {
        this.updateResponseText(`Processing: "${command}"`);
        this.processCommand(command);
        this.stopListening();
      } else {
        this.updateResponseText('Please say a command');
        // Continue listening
      }
    }
  },
  
  updateVoiceIndicator: function(isActive) {
    if (this.voiceIndicator) {
      if (isActive) {
        this.voiceIndicator.classList.add('active');
      } else {
        this.voiceIndicator.classList.remove('active');
      }
    }
    
    if (this.listenButton) {
      this.listenButton.textContent = isActive ? 'Stop' : 'Listen';
    }
  },
  
  updateResponseText: function(text) {
    if (this.responseText) {
      this.responseText.textContent = text;
    }
  },
  
  speak: function(text) {
    if (!this.utterance) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    // Set up new utterance
    this.utterance.text = text;
    
    // Speak
    window.speechSynthesis.speak(this.utterance);
    
    // Update UI
    this.updateResponseText(text);
  },
  
  processCommand: function(command) {
    // Normalize command
    command = command.toLowerCase().trim();
    
    // Add to command history
    this.commandHistory.push({
      command: command,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (this.commandHistory.length > 10) {
      this.commandHistory.shift();
    }
    
    // Log the command
    console.log('Processing command:', command);
    this.lastCommandTime = Date.now();

    // Check for direct system commands first
    if (this.processDirectCommand(command)) {
      return; // Command was handled directly
    }
    
    // Use Gemini API for natural language commands
    this.processWithGemini(command);
    
    // Emit the command event for other components
    this.el.emit('voice-command', {
      command: command,
      processed: true
    });
  },
  
  processDirectCommand: function(command) {
    // Handle direct commands without calling Gemini

    // Check for mixed reality mode switching
    if (command.includes('switch to lab') || command.includes('enter lab') || command === 'lab mode') {
      this.switchToLabMode();
      return true;
    }
    else if (command.includes('switch to ar') || command.includes('enable passthrough') || command === 'ar mode') {
      this.switchToARMode();
      return true;
    }
    // Handle screen management commands
    else if (command.includes('create screen') || command.includes('new screen') || command === 'add screen') {
      this.createScreen();
      return true;
    } 
    else if (command.includes('create workspace') || command === 'setup workspace') {
      this.createWorkspace();
      return true;
    }
    else if (command.includes('remote desktop') || command === 'open desktop') {
      this.openRemoteDesktop();
      return true;
    }
    else if (command.includes('help') || command === 'what can you do') {
      this.showHelp();
      return true;
    }
    
    // Command not handled directly
    return false;
  },
  
  processWithGemini: function(command) {
    if (!window.geminiAPI) {
      console.error('Gemini API not available');
      this.speak("I'm sorry, sir, but the Gemini language model is not available.");
      return;
    }
    
    this.updateResponseText('Processing...');
    
    window.geminiAPI.generateContent(command)
      .then(response => {
        if (response && response.text) {
          this.speak(response.text);
          
          // Check for special instructions in the response
          this.checkForActions(response.text);
        } else if (response.error) {
          console.error('Gemini API error:', response.error);
          this.speak("I encountered an error processing your request: " + response.error);
        } else {
          this.speak("I received a response but couldn't process it.");
        }
      })
      .catch(error => {
        console.error('Gemini API error:', error);
        this.speak("I'm sorry, sir, but I encountered an error processing your request.");
      });
  },
  
  checkForActions: function(text) {
    // Check if response contains action instructions
    if (text.includes('[CREATE_SCREEN]')) {
      this.createScreen();
    }
    if (text.includes('[CREATE_WORKSPACE]')) {
      this.createWorkspace();
    }
    if (text.includes('[OPEN_DESKTOP]')) {
      this.openRemoteDesktop();
    }
    if (text.includes('[SWITCH_TO_LAB]')) {
      this.switchToLabMode();
    }
    if (text.includes('[SWITCH_TO_AR]')) {
      this.switchToARMode();
    }
  },
  
  createScreen: function() {
    // Notify screen manager to create a new screen
    this.el.sceneEl.emit('create-screen', {
      position: 'center',
      template: 'browser'
    });
    
    if (!this.processingCommand) {
      this.speak("Creating a new screen for you, sir.");
    }
  },
  
  createWorkspace: function() {
    // Notify workstation manager to create a workspace
    this.el.sceneEl.emit('create-workspace');
    
    if (!this.processingCommand) {
      this.speak("Setting up your workspace with multiple screens, sir.");
    }
  },
  
  openRemoteDesktop: function() {
    // Open remote desktop in a virtual screen
    this.el.sceneEl.emit('create-screen', {
      position: 'center',
      template: 'browser',
      url: 'https://remotedesktop.google.com/access'
    });
    
    if (!this.processingCommand) {
      this.speak("Opening remote desktop access.");
    }
  },
  
  switchToLabMode: function() {
    this.el.sceneEl.emit('switch-environment', { mode: 'lab' });
    
    if (!this.processingCommand) {
      this.speak("Switching to lab environment mode.");
    }
  },
  
  switchToARMode: function() {
    this.el.sceneEl.emit('switch-environment', { mode: 'ar' });
    
    if (!this.processingCommand) {
      this.speak("Enabling augmented reality mode.");
    }
  },
  
  showHelp: function() {
    // Create help screen with available commands
    const helpText = `
      Voice Commands:
      - "Create a new screen"
      - "Set up my workspace"
      - "Open remote desktop"
      - "Switch to lab" or "Enter lab"
      - "Switch to AR" or "Enable passthrough"
      - You can also ask any question
      
      Keyboard Shortcuts:
      Space: Toggle listening
      C: Create screen
      V: Create workspace
      B: Toggle UI
      H: Show this help
    `;
    
    this.speak("Here are some available commands, sir.");
    
    // Create a help panel
    this.el.sceneEl.emit('create-info-panel', {
      title: 'JARVIS Help',
      content: helpText
    });
  }
});