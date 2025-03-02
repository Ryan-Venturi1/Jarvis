/* JARVIS Environment Manager */

// A-Frame component for managing environment modes (AR vs Lab)
AFRAME.registerComponent('environment-manager', {
    schema: {
      defaultMode: {type: 'string', default: 'lab'},
      labPreset: {type: 'string', default: 'default'},
      labLighting: {type: 'string', default: 'point'},
      labGroundColor: {type: 'color', default: '#222'},
      labFogColor: {type: 'color', default: '#000'},
      arTransparency: {type: 'number', default: 0.7}
    },
    
    init: function() {
      this.currentMode = this.data.defaultMode;
      
      // Get references to environment elements
      this.environment = document.querySelector('#environment');
      this.floor = document.querySelector('#floor');
      
      // Setup AR Mode detection
      this.hasARSession = false;
      this.xrSessionMode = null;
      
      // Set up event listeners
      this.el.addEventListener('switch-environment', this.switchEnvironment.bind(this));
      this.el.addEventListener('enter-vr', this.onEnterVR.bind(this));
      this.el.addEventListener('exit-vr', this.onExitVR.bind(this));
      
      // Apply initial mode
      setTimeout(() => {
        this.applyEnvironmentMode(this.currentMode);
      }, 1000);
    },
    
    switchEnvironment: function(event) {
      const mode = event.detail.mode;
      if (mode === 'ar' || mode === 'lab') {
        this.currentMode = mode;
        this.applyEnvironmentMode(mode);
      }
    },
    
    onEnterVR: function() {
      // Check if this is an AR session
      if (this.el.sceneEl.is('ar-mode')) {
        this.hasARSession = true;
        this.xrSessionMode = 'immersive-ar';
        
        // Force AR mode when in AR
        this.applyEnvironmentMode('ar');
      } else {
        this.hasARSession = false;
        this.xrSessionMode = 'immersive-vr';
      }
    },
    
    onExitVR: function() {
      this.hasARSession = false;
      this.xrSessionMode = null;
      
      // Reapply current mode
      this.applyEnvironmentMode(this.currentMode);
    },
    
    applyEnvironmentMode: function(mode) {
      console.log(`Switching to ${mode} mode`);
      
      if (mode === 'ar') {
        this.enableARMode();
      } else {
        this.enableLabMode();
      }
      
      // Notify other components about mode change
      this.el.emit('environment-changed', {
        mode: mode,
        isAR: mode === 'ar'
      });
    },
    
    enableARMode: function() {
      // In AR mode, we hide the environment and make elements less opaque
      if (this.environment) {
        this.environment.setAttribute('visible', false);
      }
      
      if (this.floor) {
        this.floor.setAttribute('visible', false);
      }
      
      // Adjust existing screens for AR
      this.adjustScreensForAR(true);
      
      // Enable AR session if not already in one and device supports it
      if (!this.hasARSession && navigator.xr) {
        // Check if AR is supported and we're not already in VR
        if (!this.el.sceneEl.is('vr-mode')) {
          this.checkAndRequestARSession();
        }
      }
      
      // Make sure scene has passthrough camera or transparent background if in AR
      this.el.sceneEl.setAttribute('background', {color: 'transparent'});
    },
    
    enableLabMode: function() {
      // In Lab mode, show the environment
      if (this.environment) {
        this.environment.setAttribute('visible', true);
        this.environment.setAttribute('environment', {
          preset: this.data.labPreset,
          lighting: this.data.labLighting,
          shadow: true,
          ground: 'flat',
          groundColor: this.data.labGroundColor,
          groundColor2: '#333',
          dressing: 'none',
          fog: 0.4,
          fogColor: this.data.labFogColor
        });
      }
      
      if (this.floor) {
        this.floor.setAttribute('visible', true);
      }
      
      // Adjust existing screens for Lab
      this.adjustScreensForAR(false);
      
      // Reset scene background
      this.el.sceneEl.setAttribute('background', {color: '#000'});
    },
    
    adjustScreensForAR: function(isAR) {
      // Find all screens and adjust their opacity for AR mode
      const screens = document.querySelectorAll('.virtual-screen');
      
      screens.forEach(screen => {
        const background = screen.querySelector('.screen-background');
        if (background) {
          const currentOpacity = parseFloat(background.getAttribute('opacity') || 0.9);
          const newOpacity = isAR ? this.data.arTransparency : 0.9;
          background.setAttribute('opacity', newOpacity);
        }
      });
    },
    
    checkAndRequestARSession: function() {
      // Check if AR is supported
      if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-ar')
          .then(supported => {
            if (supported) {
              // Try to enter AR mode
              this.el.sceneEl.setAttribute('xr', {
                requiredFeatures: 'hit-test,local-floor,hand-tracking',
                optionalFeatures: 'dom-overlay,unbounded'
              });
              
              // Notify users that they can enter AR
              this.el.emit('create-info-panel', {
                title: 'AR Mode Ready',
                content: 'Click the VR button to enter augmented reality mode.'
              });
            } else {
              console.log('AR not supported on this device.');
              this.el.emit('create-info-panel', {
                title: 'AR Not Available',
                content: 'Your device does not support AR mode. Using Lab mode instead.'
              });
            }
          });
      }
    },
    
    // Detect walls and obstacles in AR mode
    detectObstacles: function() {
      // This would use the WebXR Depth API for Quest 3 room mapping
      // Currently a placeholder for future implementation
      console.log('Detecting obstacles in room');
      
      // For now, we'll just create a simple safe zone
      const safeZone = document.createElement('a-entity');
      safeZone.setAttribute('id', 'safe-zone');
      safeZone.setAttribute('geometry', 'primitive: cylinder; radius: 1.5; height: 0.01');
      safeZone.setAttribute('material', 'color: #4c86f1; opacity: 0.2; transparent: true');
      safeZone.setAttribute('position', '0 0.01 0');
      
      this.el.sceneEl.appendChild(safeZone);
    }
  });
  
  // Initialize environment manager on scene
  document.addEventListener('DOMContentLoaded', () => {
    // Add environment manager to scene
    const scene = document.querySelector('a-scene');
    if (scene && !scene.hasAttribute('environment-manager')) {
      scene.setAttribute('environment-manager', '');
    }
  });