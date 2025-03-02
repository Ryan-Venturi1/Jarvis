/* JARVIS WebVR Main Script */

// Initialize JARVIS system
document.addEventListener('DOMContentLoaded', () => {
    console.log('JARVIS WebVR initializing...');
    
    // Set up UI interactions
    setupUIInteractions();
    
    // Check for WebXR support
    checkWebXRSupport();
    
    // Initialize system
    initJARVIS();
  });
  
  // Setup UI interactions
  function setupUIInteractions() {
    // Voice panel
    const voicePanel = document.getElementById('voice-panel');
    const voiceIndicator = document.getElementById('voice-indicator');
    const responseText = document.getElementById('response-text');
    const listenButton = document.getElementById('listen-button');
    
    // Status panel
    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');
    const activateButton = document.getElementById('activate-button');
    
    // Set up activation button
    if (activateButton) {
      activateButton.addEventListener('click', () => {
        // Toggle system
        const scene = document.querySelector('a-scene');
        if (scene.components['workstation-manager']) {
          scene.components['workstation-manager'].toggleSystem();
        }
      });
    }
    
    // Set up listen button
    if (listenButton) {
      listenButton.addEventListener('click', () => {
        // Toggle listening
        const scene = document.querySelector('a-scene');
        if (scene.components['voice-controller']) {
          scene.components['voice-controller'].toggleListening();
        }
      });
    }
  }
  
  // Check for WebXR support
  function checkWebXRSupport() {
    // Check for WebXR support
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr')
        .then(supported => {
          if (supported) {
            console.log('WebXR VR supported');
            document.body.classList.add('webxr-supported');
          } else {
            console.log('WebXR VR not supported');
            document.body.classList.add('webxr-not-supported');
            showWebXRWarning();
          }
        })
        .catch(err => {
          console.error('Error checking WebXR support:', err);
          document.body.classList.add('webxr-error');
          showWebXRWarning();
        });
    } else {
      console.log('WebXR not available');
      document.body.classList.add('webxr-not-available');
      showWebXRWarning();
    }
  }
  
  // Show WebXR warning
  function showWebXRWarning() {
    // Only show in browsers that don't support WebXR
    const warning = document.createElement('div');
    warning.id = 'webxr-warning';
    warning.innerHTML = `
      <div class="warning-content">
        <h2>WebXR Not Supported</h2>
        <p>Your browser doesn't support WebXR or VR hardware wasn't detected.</p>
        <p>JARVIS will work in desktop mode with limited functionality.</p>
        <p>For the best experience, please use a WebXR-compatible browser and VR headset.</p>
        <button id="continue-anyway">Continue Anyway</button>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    // Add button listener
    document.getElementById('continue-anyway').addEventListener('click', () => {
      warning.style.display = 'none';
    });
  }
  
  // Initialize JARVIS system
  function initJARVIS() {
    // Set up keyboard controls for desktop use
    setupKeyboardControls();
    
    // Add event listeners for WebXR session
    const scene = document.querySelector('a-scene');
    
    scene.addEventListener('enter-vr', () => {
      console.log('Entered VR mode');
      document.body.classList.add('in-vr');
      
      // Start system when entering VR
      if (scene.components['workstation-manager']) {
        scene.components['workstation-manager'].activateSystem(true);
      }
    });
    
    scene.addEventListener('exit-vr', () => {
      console.log('Exited VR mode');
      document.body.classList.remove('in-vr');
    });
    
    // Initialize Web Speech API if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('Web Speech API supported');
      document.body.classList.add('speech-supported');
    } else {
      console.log('Web Speech API not supported');
      document.body.classList.add('speech-not-supported');
      
      // Update UI to show speech not supported
      const responseText = document.getElementById('response-text');
      if (responseText) {
        responseText.textContent = 'Speech recognition not supported in this browser';
      }
    }
  }
  
  // Setup keyboard controls for desktop use
  function setupKeyboardControls() {
    // WASD + Arrow keys handled by A-Frame
    
    // Additional keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const scene = document.querySelector('a-scene');
      
      switch (e.code) {
        case 'KeyC':
          // Create screen
          scene.emit('create-screen', {
            position: 'center'
          });
          break;
        
        case 'KeyV':
          // Create workspace
          scene.emit('create-workspace');
          break;
        
        case 'KeyB':
          // Toggle UI
          toggleUI();
          break;
        
        case 'KeyM':
          // Toggle microphone
          if (scene.components['voice-controller']) {
            scene.components['voice-controller'].toggleListening();
          }
          break;
          
        case 'KeyH':
          // Show help
          scene.emit('create-info-panel', {
            title: 'Keyboard Controls',
            content: `
              Space: Activate/Deactivate JARVIS
              C: Create Screen
              V: Create Workspace
              B: Toggle UI
              M: Toggle Microphone
              F: Simulate Push Gesture (right hand)
              G: Simulate Swipe Gesture (right hand)
              WASD/Arrows: Movement
              Q/E: Rotate
            `
          });
          break;
      }
    });
  }
  
  // Toggle UI visibility
  function toggleUI() {
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) {
      uiOverlay.classList.toggle('hidden');
    }
  }
  
  // Debug function to load without API key
  window.useWithoutAPIKey = function() {
    const scene = document.querySelector('a-scene');
    
    if (scene.components['workstation-manager']) {
      scene.components['workstation-manager'].activateSystem(true);
    }
    
    if (scene.components['voice-controller']) {
      // Set dummy handler for commands
      scene.components['voice-controller'].processWithGemini = function(command) {
        // Simple command handling
        if (command.includes('screen')) {
          this.createScreen();
          this.speak("Creating a screen for you");
        } else if (command.includes('workspace')) {
          this.createWorkspace();
          this.speak("Setting up your workspace");
        } else {
          this.speak("I understood: " + command);
        }
      };
    }
    
    // Hide warning
    const warning = document.getElementById('webxr-warning');
    if (warning) {
      warning.style.display = 'none';
    }
  };