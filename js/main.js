/* JARVIS WebVR Main Script for Meta Quest 3 */

// Initialize JARVIS system
document.addEventListener('DOMContentLoaded', () => {
  console.log('JARVIS WebVR initializing for Meta Quest 3...');
  
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
  
  // Set up environment toggle buttons
  const labModeButton = document.createElement('button');
  labModeButton.id = 'lab-mode-button';
  labModeButton.textContent = 'Lab Mode';
  labModeButton.addEventListener('click', () => switchEnvironment('lab'));
  
  const arModeButton = document.createElement('button');
  arModeButton.id = 'ar-mode-button';
  arModeButton.textContent = 'AR Mode';
  arModeButton.addEventListener('click', () => switchEnvironment('ar'));
  
  // Add to status panel
  if (statusPanel) {
    statusPanel.appendChild(labModeButton);
    statusPanel.appendChild(arModeButton);
  }
}

// Switch environment mode
function switchEnvironment(mode) {
  const scene = document.querySelector('a-scene');
  scene.emit('switch-environment', { mode: mode });
}

// Check for WebXR support for Meta Quest 3
function checkWebXRSupport() {
  // Check for WebXR support
  if (navigator.xr) {
    // Check for VR support
    navigator.xr.isSessionSupported('immersive-vr')
      .then(supported => {
        if (supported) {
          console.log('WebXR VR supported');
          document.body.classList.add('webxr-supported');
          
          // Check for AR support (Meta Quest 3 supports passthrough)
          return navigator.xr.isSessionSupported('immersive-ar');
        } else {
          console.log('WebXR VR not supported');
          document.body.classList.add('webxr-not-supported');
          showWebXRWarning();
          return Promise.resolve(false);
        }
      })
      .then(arSupported => {
        if (arSupported) {
          console.log('WebXR AR (passthrough) supported - likely a Meta Quest 3 or similar headset');
          document.body.classList.add('ar-supported');
        } else {
          console.log('WebXR AR not supported');
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
      <p>JARVIS works best on a Meta Quest 3 with WebXR support.</p>
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

// Initialize JARVIS system for Meta Quest 3
function initJARVIS() {
  // Set up keyboard controls for desktop use
  setupKeyboardControls();
  
  // Add event listeners for WebXR session
  const scene = document.querySelector('a-scene');
  
  scene.addEventListener('enter-vr', () => {
    console.log('Entered VR mode');
    document.body.classList.add('in-vr');
    
    // Check if we're in AR mode
    if (scene.is('ar-mode')) {
      console.log('AR passthrough mode detected');
      document.body.classList.add('in-ar');
      
      // Switch to AR environment
      switchEnvironment('ar');
    } else {
      // Switch to lab environment
      switchEnvironment('lab');
    }
    
    // Start system when entering VR
    if (scene.components['workstation-manager']) {
      scene.components['workstation-manager'].activateSystem(true);
    }
    
    // Enable surface detection
    enableSurfaceDetection(true);
  });
  
  scene.addEventListener('exit-vr', () => {
    console.log('Exited VR mode');
    document.body.classList.remove('in-vr');
    document.body.classList.remove('in-ar');
    
    // Disable surface detection
    enableSurfaceDetection(false);
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
  
  // Initialize hand tracking if available
  if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr')
      .then(supported => {
        if (supported) {
          // Add hand tracking reference space
          scene.setAttribute('webxr', {
            referenceSpaceType: 'local-floor',
            optionalFeatures: 'hand-tracking, hit-test'
          });
          
          console.log('Hand tracking support requested');
        }
      });
  }
  
  // Configure scene for Meta Quest 3
  configureForMetaQuest();
}

// Enable or disable surface detection
function enableSurfaceDetection(enable) {
  const scene = document.querySelector('a-scene');
  scene.emit('toggle-surface-detection', { enabled: enable });
}

// Setup keyboard controls for desktop use
function setupKeyboardControls() {
  // WASD + Arrow keys handled by A-Frame
  
  // Additional keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const scene = document.querySelector('a-scene');
    
    // Skip if typing in an input field
    if (document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA' ||
         document.activeElement.isContentEditable)) {
      return;
    }
    
    switch (e.code) {
      case 'KeyC':
        // Create screen
        scene.emit('create-screen', {
          position: 'center',
          template: 'browser'
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
        
      case 'KeyL':
        // Switch to lab mode
        switchEnvironment('lab');
        break;
        
      case 'KeyA':
        // Switch to AR mode
        switchEnvironment('ar');
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
            L: Switch to Lab Mode
            A: Switch to AR Mode
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

// Configure scene for Meta Quest 3
function configureForMetaQuest() {
  const scene = document.querySelector('a-scene');
  
  // Set up hand controllers
  const leftHand = document.getElementById('left-hand');
  const rightHand = document.getElementById('right-hand');
  
  if (leftHand) {
    leftHand.setAttribute('hand-controls', 'hand: left; handModelStyle: lowPoly');
    leftHand.setAttribute('hand-tracking', 'hand: left');
    leftHand.setAttribute('hand-controller', 'hand: left; effectColor: #15ACCF');
    leftHand.setAttribute('visible', 'true');
  }
  
  if (rightHand) {
    rightHand.setAttribute('hand-controls', 'hand: right; handModelStyle: lowPoly');
    rightHand.setAttribute('hand-tracking', 'hand: right');
    rightHand.setAttribute('hand-controller', 'hand: right; effectColor: #4c86f1');
    rightHand.setAttribute('visible', 'true');
  }
  
  // Set up surface detector for keyboard placement
  if (!scene.getAttribute('surface-detector')) {
    scene.setAttribute('surface-detector', '');
  }
  
  // Set up environment manager
  if (!scene.getAttribute('environment-manager')) {
    scene.setAttribute('environment-manager', '');
  }
  
  // Set up screen manager (if not already added)
  if (!scene.getAttribute('screen-manager')) {
    scene.setAttribute('screen-manager', 'maxScreens: 10; maxTabsPerScreen: 10');
  }
  
  // Register controllers for hit testing
  addControllerRaycasters();
}

// Add controller raycasters for interaction
function addControllerRaycasters() {
  const leftHand = document.getElementById('left-hand');
  const rightHand = document.getElementById('right-hand');
  
  // Add raycaster components for interaction
  if (leftHand && !leftHand.getAttribute('raycaster')) {
    leftHand.setAttribute('raycaster', 'objects: .virtual-screen, .keyboard-key; far: 3; showLine: true; lineColor: #15ACCF');
  }
  
  if (rightHand && !rightHand.getAttribute('raycaster')) {
    rightHand.setAttribute('raycaster', 'objects: .virtual-screen, .keyboard-key; far: 3; showLine: true; lineColor: #4c86f1');
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
      } else if (command.includes('lab')) {
        this.switchToLabMode();
        this.speak("Switching to lab mode");
      } else if (command.includes('ar') || command.includes('passthrough')) {
        this.switchToARMode();
        this.speak("Switching to AR mode");
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