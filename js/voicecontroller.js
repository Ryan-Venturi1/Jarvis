/* JARVIS Voice Controller */

// A-Frame component for voice recognition and commands
AFRAME.registerComponent('voice-controller', {
    schema: {
      autoStart: {type: 'boolean', default: false},
      listenKey: {type: 'string', default: 'Space'},
      wakeWord: {type: 'string', default: 'jarvis'},
      apiKey: {type: 'string', default: ''}
    },
    
    init: function() {
      this.isListening = false;
      this.recognition = null;
      this.utterance = null;
      this.voiceIndicator = document.getElementById('voice-indicator');
      this.responseText = document.getElementById('response-text');
      this.listenButton = document.getElementById('listen-button');
      
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
        if (e.code === this.data.listenKey) {
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
      
      // Auto-start if configured
      if (this.data.autoStart) {
        setTimeout(() => {
          this.speak("JARVIS system online. Ready for commands.");
          this.startListening();
        }, 2000);
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
      
      // Configure recognition
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
      
      // Set up event handlers
      this.recognition.onresult = this.onSpeechResult;
      
      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateVoiceIndicator(true);
        this.updateResponseText('Listening...');
        console.log('Speech recognition started');
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
        this.updateVoiceIndicator(false);
        console.log('Speech recognition ended');
      };
      
      this.recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        this.updateResponseText(`Error: ${event.error}`);
        this.isListening = false;
        this.updateVoiceIndicator(false);
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
      }
    },
    
    stopListening: function() {
      if (!this.recognition) return;
      
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping speech recognition', e);
      }
    },
    
    toggleListening: function() {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    },
    
    onSpeechResult: function(event) {
      if (!event.results || !event.results.length) return;
      
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log('Transcript:', transcript);
      
      // Check for wake word if not directly activated by button
      const wakeWord = this.data.wakeWord.toLowerCase();
      if (!this.activatedByButton && !transcript.includes(wakeWord)) {
        this.updateResponseText(`Waiting for wake word: "${this.data.wakeWord}"`);
        this.startListening(); // Keep listening
        return;
      }
      
      // Process command (remove wake word if present)
      const command = transcript.includes(wakeWord) 
        ? transcript.substring(transcript.indexOf(wakeWord) + wakeWord.length).trim() 
        : transcript;
      
      if (command) {
        this.updateResponseText(`Processing: "${command}"`);
        this.processCommand(command);
      } else {
        this.updateResponseText('Please say a command');
        // Restart listening
        setTimeout(() => this.startListening(), 1000);
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
      
      // Check for known commands
      if (command.includes('screen') && (command.includes('create') || command.includes('new'))) {
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
        // Use Gemini API for natural language commands if API key is available
        if (this.data.apiKey) {
          this.processWithGemini(command);
        } else {
          this.speak("I'm not sure how to help with that. Try asking for help to see available commands.");
        }
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
    },
    
    createScreen: function() {
      // Notify screen manager to create a new screen
      this.el.sceneEl.emit('create-screen', {
        position: 'center',
        url: 'https://example.com'
      });
      
      this.speak("Creating a new virtual screen for you.");
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
        url: 'https://remotedesktop.google.com/access'
      });
      
      this.speak("Opening remote desktop access.");
    },
    
    showHelp: function() {
      // Create help screen with available commands
      const helpText = `
        Available commands:
        - Create a new screen
        - Set up my workspace
        - Open remote desktop
        - [Any natural language query]
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
  document.addEventListener('DOMContent Loaded', function() {
    const voiceController = document.querySelector('[voice-controller]');
    if (voiceController) {
      voiceController.init();
    }
  });