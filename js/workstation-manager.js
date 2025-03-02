/* JARVIS Workstation Manager */

// A-Frame component for managing the overall workstation system
AFRAME.registerComponent('workstation-manager', {
    schema: {
      autoStart: {type: 'boolean', default: false},
      statusPanelId: {type: 'string', default: 'status-panel'},
      activateButtonId: {type: 'string', default: 'activate-button'},
      statusTextId: {type: 'string', default: 'status-text'}
    },
    
    init: function() {
      this.isActive = false;
      this.statusPanel = document.getElementById(this.data.statusPanelId);
      this.statusText = document.getElementById(this.data.statusTextId);
      this.activateButton = document.getElementById(this.data.activateButtonId);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Find other components
      this.screenManager = this.el.components['screen-manager'];
      this.voiceController = this.el.components['voice-controller'];
      
      // If auto-start is set, activate the system after a short delay
      if (this.data.autoStart) {
        setTimeout(() => {
          this.activateSystem(true);
        }, 2000);
      }
      
      // Add surface detector for keyboard placement
      if (!this.el.components['surface-detector']) {
        this.el.setAttribute('surface-detector', '');
      }
      
      // Listen for keyboard events
      this.el.addEventListener('keyboard-placed', this.onKeyboardPlaced.bind(this));
      
      // Announce system ready
      console.log('JARVIS Workstation Manager initialized');
    },
    
    setupEventListeners: function() {
      if (this.activateButton) {
        this.activateButton.addEventListener('click', () => {
          this.toggleSystem();
        });
      }
      
      // Listen for system commands
      this.el.addEventListener('voice-command', this.handleVoiceCommand.bind(this));
      
      // Keyboard shortcut for activation (Space)
      document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !this.isTypingInIframe()) {
          e.preventDefault();
          this.toggleSystem();
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
    
    toggleSystem: function() {
      this.activateSystem(!this.isActive);
    },
    
    activateSystem: function(activate) {
      this.isActive = activate;
      
      // Update status display
      this.updateStatus();
      
      // Activate or deactivate components
      if (this.isActive) {
        // Show welcome screen if first activation
        if (!this.hasActivatedBefore) {
          this.showWelcomeScreen();
          this.hasActivatedBefore = true;
        }
        
        // Start voice controller
        if (this.voiceController) {
          this.voiceController.startListening();
        }
      } else {
        // Stop voice controller
        if (this.voiceController) {
          this.voiceController.stopListening();
        }
      }
      
      // Emit event for other components
      this.el.emit('system-state-changed', {
        active: this.isActive
      });
    },
    
    updateStatus: function() {
      if (this.statusText) {
        this.statusText.textContent = this.isActive ? 'J.A.R.V.I.S. Online' : 'J.A.R.V.I.S. Standby';
      }
      
      if (this.activateButton) {
        this.activateButton.textContent = this.isActive ? 'Deactivate' : 'Activate';
      }
      
      // Show/hide welcome panel
      const welcomePanel = document.getElementById('welcome-panel');
      if (welcomePanel) {
        welcomePanel.setAttribute('visible', !this.isActive);
      }
    },
    
    showWelcomeScreen: function() {
      // Emit event to create info panel
      this.el.emit('create-info-panel', {
        title: 'Welcome to JARVIS',
        content: `
          Your virtual assistant is now online.
          
          You can create virtual screens, browse the web, and manage your workspace using voice commands.
          
          Try saying:
          - "Create a new screen"
          - "Set up my workspace"
          - "Open remote desktop"
          
          Press the Listen button or Space bar to activate voice commands.
        `
      });
    },
    
    handleVoiceCommand: function(event) {
      if (!this.isActive) {
        this.activateSystem(true);
        return;
      }
      
      const command = event.detail.command.toLowerCase();
      
      // System-level commands
      if (command.includes('shut down') || command.includes('deactivate')) {
        this.activateSystem(false);
      }
      else if (command.includes('status')) {
        this.showSystemStatus();
      }
    },
    
    showSystemStatus: function() {
      // Create status screen with system information
      const screens = this.screenManager ? this.screenManager.screens.length : 0;
      
      const statusInfo = `
        System Status: ${this.isActive ? 'Online' : 'Standby'}
        Active Screens: ${screens}
        Voice Recognition: ${this.voiceController ? 'Available' : 'Unavailable'}
        Browser: ${navigator.userAgent}
        WebXR: ${navigator.xr ? 'Supported' : 'Unsupported'}
      `;
      
      this.el.emit('create-info-panel', {
        title: 'System Status',
        content: statusInfo
      });
    },
    
    onKeyboardPlaced: function(event) {
      // Keyboard was placed on a surface
      console.log('Virtual keyboard placed:', event.detail.position);
      
      // Create a screen above the keyboard
      if (this.screenManager) {
        const position = event.detail.position;
        const screenPosition = `${position.x} ${position.y + 0.4} ${position.z}`;
        
        this.el.emit('create-screen', {
          position: screenPosition,
          template: 'browser',
          url: 'https://example.com'
        });
      }
    }
  });
  
  // Initialize workstation manager on scene
  document.addEventListener('DOMContentLoaded', () => {
    // Already added through HTML
  });