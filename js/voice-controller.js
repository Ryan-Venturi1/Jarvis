/* JARVIS Voice Controller */

// A-Frame component for voice recognition and commands
AFRAME.registerComponent('voice-controller', {
  schema: {
    autoStart: {type: 'boolean', default: false},
    listenKey: {type: 'string', default: 'Space'},
    wakeWord: {type: 'string', default: 'jarvis'},
    apiKey: {type: 'string', default: 'AIzaSyC31UsvHYJQMpqFahpqX-t4yPCwdruL0h0'}
  },
  
  init: function() {
    this.isListening = false;
    this.recognition = null;
    this.utterance = null;
    this.voiceIndicator = document.getElementById('voice-indicator');
    this.responseText = document.getElementById('response-text');
    this.listenButton = document.getElementById('listen-button');
    this.wakeWordDetected = false;
    
    // Bind methods
    this.toggleListening = this.toggleListening.bind(this);
    this.processCommand = this.processCommand.bind(this);
    this.onSpeechResult = this.onSpeechResult.bind(this);
    this.startListening = this.startListening.bind(this);
    this.stopListening = this.stopListening.bind(this);
    
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
    
    // Setup speech recognition if available
    this.setupSpeechRecognition();
    
    // Setup speech synthesis
    if ('speechSynthesis' in window) {
      this.utterance = new SpeechSynthesisUtterance();
      this.utterance.lang = 'en-US';
      this.utterance.rate = 1.0;
      this.utterance.pitch = 1.0;
    }
    
    // Pass API key to Gemini API
    if (window.geminiAPI && this.data.apiKey) {
      window.geminiAPI.init(this.data.apiKey);
    }
    
    // Auto-start if configured
    if (this.data.autoStart) {
      setTimeout(() => {
        this.speak("JARVIS system online. Ready for commands.");
        this.startListening();
      }, 2000);
    }
  },
  
  isTypingInIframe: function() {
    // Prevent activation when typing in iframe
    return document.activeElement && 
           (document.activeElement.tagName === 'INPUT' || 
            document.activeElement.tagName === 'TEXTAREA' ||
            document.activeElement.isContentEditable);
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
      this.updateResponseText('Listening for "' + this.data.wakeWord + '"...');
      console.log('Speech recognition started');
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      
      // If wake word was detected, don't restart automatically
      if (this.wakeWordDetected) {
        this.isListening = false;
        this.wakeWordDetected = false;
        this.updateVoiceIndicator(false);
      } else {
        // Otherwise keep listening for wake word
        setTimeout(() => {
          if (!this.wakeWordDetected) {
            this.startListening();
          }
        }, 500);
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
    } else {
      this.wakeWordDetected = true; // Skip wake word detection when manually toggled
      this.startListening();
    }
  },
  
  onSpeechResult: function(event) {
    if (!event.results || !event.results.length) return;
    
    // Get latest result
    const result = event.results[event.results.length - 1];
    const transcript = result[0].transcript.toLowerCase();
    
    // Check for wake word if not already detected
    const wakeWords = ["jarvis", "hey jarvis", "yo jarvis", "hi jarvis"];
    
    if (!this.wakeWordDetected) {
      // Check each wake word
      const detected = wakeWords.some(word => transcript.includes(word.toLowerCase()));
      
      if (detected) {
        this.wakeWordDetected = true;
        this.updateResponseText("Yes?");
        this.speak("Yes?");
        
        // If final result, restart to listen for command
        if (result.isFinal) {
          this.stopListening();
          setTimeout(() => this.startListening(), 500);
        }
      }
      return;
    }
    
    // Only process commands on final result
    if (result.isFinal) {
      console.log('Final transcript:', transcript);
      
      // Remove wake word if present and process command
      let command = transcript;
      wakeWords.forEach(word => {
        command = command.replace(word.toLowerCase(), "");
      });
      command = command.trim();
      
      if (command) {
        this.updateResponseText(`Processing: "${command}"`);
        this.processCommand(command);
      } else {
        this.updateResponseText('Please say a command');
        // Restart listening
        setTimeout(() => this.startListening(), 1000);
      }
    }
  },
  
  updateVoiceIndicator: function(isActive) {
    if (this.voiceIndicator) {
      this.voiceIndicator.style.backgroundColor = isActive ? '#ff3333' : '#4caf50';
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
    
    // Log the command
    console.log('Processing command:', command);

    // Check for mixed reality mode switching
    if (command.includes('switch to lab') || command.includes('enter lab')) {
      this.switchToLabMode();
    }
    else if (command.includes('switch to ar') || command.includes('enable passthrough')) {
      this.switchToARMode();
    }
    // Check for known commands
    else if (command.includes('screen') && (command.includes('create') || command.includes('new'))) {
      this.createScreen();
    } 
    else if (command.includes('workspace')) {
      this.createWorkspace();
    }
    else if (command.includes('remote desktop') || command.includes('desktop')) {
      this.openRemoteDesktop();
    }
    else if (command.includes('help') || command.includes('what can you do')) {
      this.showHelp();
    }
    else {
      // Use Gemini API for natural language commands
      this.processWithGemini(command);
    }
    
    // Emit the command event for other components
    this.el.emit('voice-command', {
      command: command,
      processed: true
    });
  },
  
  processWithGemini: function(command) {
    if (!window.geminiAPI) {
      console.error('Gemini API not available');
      this.speak("I'm sorry, but the Gemini language model is not available.");
      return;
    }
    
    this.updateResponseText('Thinking...');
    
    window.geminiAPI.generateContent(command)
      .then(response => {
        if (response && response.text) {
          this.speak(response.text);
          
          // Check for special instructions in the response
          this.checkForActions(response.text);
        } else if (response.error) {
          console.error('Gemini API error:', response.error);
          this.speak("I encountered an error: " + response.error);
        } else {
          this.speak("I received a response but couldn't process it.");
        }
      })
      .catch(error => {
        console.error('Gemini API error:', error);
        this.speak("I'm sorry, but I encountered an error processing your request.");
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
  },
  
  createWorkspace: function() {
    // Notify workstation manager to create a workspace
    this.el.sceneEl.emit('create-workspace');
    this.speak("Setting up your workspace with multiple screens.");
  },
  
  openRemoteDesktop: function() {
    // Open remote desktop in a virtual screen
    this.el.sceneEl.emit('create-screen', {
      position: 'center',
      template: 'browser',
      url: 'https://remotedesktop.google.com/access'
    });
    
    this.speak("Opening remote desktop access.");
  },
  
  switchToLabMode: function() {
    this.el.sceneEl.emit('switch-environment', { mode: 'lab' });
    this.speak("Switching to lab environment mode.");
  },
  
  switchToARMode: function() {
    this.el.sceneEl.emit('switch-environment', { mode: 'ar' });
    this.speak("Switching to augmented reality passthrough mode.");
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
    
    this.speak("Here are some commands you can use.");
    
    // Create a help panel
    this.el.sceneEl.emit('create-info-panel', {
      title: 'JARVIS Help',
      content: helpText
    });
  }
});

// Initialize voice controller on scene
document.addEventListener('DOMContentLoaded', () => {
  // Add voice controller to scene if not already present
  const scene = document.querySelector('a-scene');
  if (scene && !scene.hasAttribute('voice-controller')) {
    scene.setAttribute('voice-controller', '');
  }
});