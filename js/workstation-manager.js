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
      this.environmentManager = this.el.components['environment-manager'];
      this.remoteDesktopManager = this.el.components['remote-desktop-manager'];
      this.surfaceDetector = this.el.components['enhanced-surface-detector'] || this.el.components['surface-detector'];

      // Store system state
      this.sessionStartTime = Date.now();
      this.commandCount = 0;
      this.activeMode = 'default'; // 'default', 'lab', 'ar''
      
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
      
      // Track command usage
      this.commandCount++;
      
      // System-level commands
      if (command.includes('shut down') || command.includes('deactivate')) {
        this.activateSystem(false);
      }
      else if (command.includes('status')) {
        this.showSystemStatus();
      }
      // Environment commands
      else if (command.includes('lab mode') || command.includes('enter lab') || command.includes('switch to lab')) {
        this.switchToLabMode();
      }
      else if (command.includes('ar mode') || command.includes('augmented reality') || command.includes('passthrough')) {
        this.switchToARMode();
      }
      // Surface commands
      else if (command.includes('scan surface') || command.includes('find surface') || command.includes('detect surface')) {
        this.scanForSurfaces();
      }
      // Remote app commands
      else if (command.match(/open\s+(\w+)/i)) {
        const appMatch = command.match(/open\s+(\w+)/i);
        if (appMatch && appMatch[1]) {
          const appName = appMatch[1].toLowerCase();
          this.openRemoteApp(appName);
        }
      }
      // Remote desktop workspace commands
      else if (command.includes('work') && command.includes('space')) {
        if (command.includes('dev') || command.includes('development')) {
          this.createDevelopmentWorkspace();
        } else if (command.includes('productivity') || command.includes('office')) {
          this.createProductivityWorkspace();
        } else if (command.includes('media') || command.includes('entertainment')) {
          this.createMediaWorkspace();
        } else {
          // Default workspace
          this.createWorkspace();
        }
      }
    },
    
    // ADD THESE NEW FUNCTIONS:
    switchToLabMode: function() {
      if (this.environmentManager) {
        this.environmentManager.switchEnvironment({ detail: { mode: 'lab' } });
        this.activeMode = 'lab';
        console.log('Switched to Stark Industries Lab mode');
      }
    },
    
    switchToARMode: function() {
      if (this.environmentManager) {
        this.environmentManager.switchEnvironment({ detail: { mode: 'ar' } });
        this.activeMode = 'ar';
        console.log('Switched to AR passthrough mode');
      }
    },
    
    scanForSurfaces: function() {
      if (this.surfaceDetector) {
        this.el.emit('scan-surfaces');
        console.log('Scanning for usable surfaces');
      }
    },
    
    openRemoteApp: function(appName) {
      if (this.remoteDesktopManager) {
        // Determine best template based on app name
        let template = 'default';
        
        // Productivity apps
        if (['docs', 'sheets', 'slides', 'mail', 'gmail', 'calendar', 'meet'].includes(appName)) {
          template = 'productivity';
        }
        // Development apps
        else if (['vscode', 'code', 'github', 'git', 'terminal', 'bash', 'cmd'].includes(appName)) {
          template = 'workspace';
        }
        // Windows apps
        else if (['excel', 'word', 'powerpoint', 'outlook', 'notepad', 'explorer'].includes(appName)) {
          template = 'windows';
        }
        
        this.el.emit('open-remote-app', {
          app: appName,
          template: template,
          position: 'center'
        });
        
        console.log(`Opening remote app: ${appName} using ${template} template`);
      }
    },
    
    createDevelopmentWorkspace: function() {
      if (this.remoteDesktopManager) {
        this.el.emit('create-workspace-with-remote-desktops', {
          type: 'development'
        });
        console.log('Creating development workspace');
      }
    },
    
    createProductivityWorkspace: function() {
      if (this.remoteDesktopManager) {
        this.el.emit('create-workspace-with-remote-desktops', {
          type: 'productivity'
        });
        console.log('Creating productivity workspace');
      }
    },
    
    createMediaWorkspace: function() {
      if (this.remoteDesktopManager) {
        this.el.emit('create-workspace-with-remote-desktops', {
          type: 'media'
        });
        console.log('Creating media workspace');
      }
    },
    
    showSystemStatus: function() {
      // Enhanced status screen with rich information
      const screens = this.screenManager ? this.screenManager.screens.length : 0;
      const maxScreens = this.screenManager ? this.screenManager.data.maxScreens : 10;
      
      const keyboards = this.surfaceDetector ? this.surfaceDetector.keyboards.length : 0;
      const maxKeyboards = this.surfaceDetector ? this.surfaceDetector.data.maxKeyboards : 3;
      
      const connections = this.remoteDesktopManager ? this.remoteDesktopManager.connections.length : 0;
      const maxConnections = this.remoteDesktopManager ? this.remoteDesktopManager.data.maxConnections : 10;
      
      // Calculate session time
      const sessionDuration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
      const hours = Math.floor(sessionDuration / 3600);
      const minutes = Math.floor((sessionDuration % 3600) / 60);
      const seconds = sessionDuration % 60;
      const sessionTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Detect AR/VR capabilities
      let xrMode = 'None';
      if (this.sceneEl.is('ar-mode')) {
        xrMode = 'AR Passthrough';
      } else if (this.sceneEl.is('vr-mode')) {
        xrMode = 'VR';
      }
      
      // Get info about detected surfaces
      const surfaceCount = this.surfaceDetector ? 
        Object.keys(this.surfaceDetector.detectedSurfaces || {}).length : 0;
      
      const statusInfo = `
        J.A.R.V.I.S. SYSTEM STATUS
        -------------------------
        System Status: ${this.isActive ? '🟢 Online' : '🟠 Standby'}
        Current Mode: ${this.activeMode.toUpperCase()}
        XR Mode: ${xrMode}
        Session Time: ${sessionTimeStr}
        Commands Processed: ${this.commandCount}
        
        RESOURCES
        -------------------------
        Active Screens: ${screens}/${maxScreens}
        Virtual Keyboards: ${keyboards}/${maxKeyboards}
        Remote Connections: ${connections}/${maxConnections}
        Detected Surfaces: ${surfaceCount}
        
        HARDWARE
        -------------------------
        Device: Meta Quest 3
        AR Passthrough: ${navigator.xr ? '✓ Available' : '✗ Unavailable'}
        Hand Tracking: ${navigator.xr ? '✓ Available' : '✗ Unavailable'}
        Surface Detection: ${this.surfaceDetector ? '✓ Active' : '✗ Inactive'}
        
        API SERVICES
        -------------------------
        Gemini API: ${window.geminiAPI && window.geminiAPI.apiKey ? '✓ Connected' : '✗ Not Connected'}
        Voice Recognition: ${this.voiceController ? '✓ Active' : '✗ Inactive'}
        Environment Manager: ${this.environmentManager ? '✓ Active' : '✗ Inactive'}
      `;
      
      this.el.emit('create-info-panel', {
        title: 'J.A.R.V.I.S. System Status',
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