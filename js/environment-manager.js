/* JARVIS Enhanced Environment Manager */

// A-Frame component for managing environment modes (AR vs Lab)
AFRAME.registerComponent('environment-manager', {
    schema: {
      defaultMode: {type: 'string', default: 'lab'},
      labPreset: {type: 'string', default: 'default'},
      labLighting: {type: 'string', default: 'point'},
      labGroundColor: {type: 'color', default: '#222'},
      labGridColor: {type: 'color', default: '#4c86f1'},
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
      
      // Remove any lab elements if present
      this.removeLabElements();
      
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
      console.log('Enabling enhanced lab environment');
      
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
          dressing: 'office', // Add furniture and objects
          dressingAmount: 10, // Moderate amount of objects
          dressingColor: '#888',
          fog: 0.4,
          grid: 'dots',
          gridColor: this.data.labGridColor
        });
      }
      
      if (this.floor) {
        this.floor.setAttribute('visible', true);
      }
      
      // Add lab-specific elements if they don't exist yet
      this.addLabElements();
      
      // Adjust existing screens for Lab
      this.adjustScreensForAR(false);
      
      // Reset scene background
      this.el.sceneEl.setAttribute('background', {color: '#000'});
    },
    
    addLabElements: function() {
      const scene = this.el.sceneEl;
      
      // Check if we already added lab elements
      if (document.getElementById('lab-elements')) {
        document.getElementById('lab-elements').setAttribute('visible', true);
        return;
      }
      
      // Create container for lab elements
      const labElements = document.createElement('a-entity');
      labElements.setAttribute('id', 'lab-elements');
      
      // Add holographic circle on floor
      const floorCircle = document.createElement('a-entity');
      floorCircle.setAttribute('geometry', 'primitive: circle; radius: 2;');
      floorCircle.setAttribute('rotation', '-90 0 0');
      floorCircle.setAttribute('position', '0 0.01 0');
      floorCircle.setAttribute('material', 'color: #4c86f1; opacity: 0.3; transparent: true');
      labElements.appendChild(floorCircle);
      
      // Add animated rings around the user
      const rings = document.createElement('a-entity');
      rings.setAttribute('id', 'lab-rings');
      rings.setAttribute('position', '0 1.3 0');
      
      // Create 3 rotating rings
      const ringColors = ['#4c86f1', '#15ACCF', '#5A67D8'];
      for (let i = 0; i < 3; i++) {
        const ring = document.createElement('a-entity');
        ring.setAttribute('geometry', `primitive: torus; radius: ${1.5 + i * 0.2}; radiusTubular: 0.01;`);
        ring.setAttribute('material', `color: ${ringColors[i]}; opacity: 0.5; transparent: true`);
        ring.setAttribute('animation', `property: rotation; to: ${i * 30} ${360} ${i * 20}; dur: ${10000 + i * 2000}; easing: linear; loop: true`);
        rings.appendChild(ring);
      }
      
      labElements.appendChild(rings);
      
      // Add holographic displays around the room
      const displayPositions = [
        { x: -3, y: 1.5, z: -2, ry: 30 },
        { x: 3, y: 1.5, z: -2, ry: -30 },
        { x: -2, y: 1.5, z: -3, ry: 15 },
        { x: 2, y: 1.5, z: -3, ry: -15 }
      ];
      
      displayPositions.forEach((pos, index) => {
        const display = document.createElement('a-entity');
        display.setAttribute('geometry', 'primitive: plane; width: 1; height: 0.6;');
        display.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
        display.setAttribute('rotation', `0 ${pos.ry} 0`);
        display.setAttribute('material', 'color: #15ACCF; opacity: 0.7; transparent: true');
        
        // Add scrolling text effect
        const text = document.createElement('a-text');
        text.setAttribute('value', 'JARVIS SYSTEM ONLINE\n\nMONITORING\n\nSTATUS: ACTIVE');
        text.setAttribute('color', 'white');
        text.setAttribute('align', 'center');
        text.setAttribute('width', 4);
        text.setAttribute('position', '0 0 0.01');
        text.setAttribute('animation', 'property: value; from: JARVIS SYSTEM ONLINE\n\nMONITORING\n\nSTATUS: ACTIVE; to: ENVIRONMENT SECURE\n\nAR SYSTEMS: ONLINE\n\nREADY; dur: 5000; easing: linear; loop: true');
        
        display.appendChild(text);
        labElements.appendChild(display);
      });
      
      // Add ceiling grid effect
      const ceilingGrid = document.createElement('a-entity');
      ceilingGrid.setAttribute('geometry', 'primitive: plane; width: 10; height: 10;');
      ceilingGrid.setAttribute('material', 'color: #4c86f1; opacity: 0.2; transparent: true; side: double');
      ceilingGrid.setAttribute('rotation', '90 0 0');
      ceilingGrid.setAttribute('position', '0 2.5 0');
      
      // Add grid texture
      ceilingGrid.setAttribute('material', 'src: #grid-texture');
      
      // Create and add a grid texture if not already present
      if (!document.querySelector('#grid-texture')) {
        const assets = document.querySelector('a-assets') || document.createElement('a-assets');
        
        const gridImg = document.createElement('img');
        gridImg.setAttribute('id', 'grid-texture');
        gridImg.setAttribute('src', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gMTAwIDAgTCAwIDAgTCAwIDEwMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGM4NmYxIiBzdHJva2Utd2lkdGg9IjAuNSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9InVybCgjZ3JpZCkiIC8+PC9zdmc+');
        
        if (!document.querySelector('a-assets')) {
          scene.appendChild(assets);
        }
        
        document.querySelector('a-assets').appendChild(gridImg);
      }
      
      labElements.appendChild(ceilingGrid);
      
      // Add animated projector beams
      for (let i = 0; i < 3; i++) {
        const beam = document.createElement('a-entity');
        beam.setAttribute('geometry', 'primitive: cylinder; radius: 0.02; height: 2;');
        beam.setAttribute('material', 'color: #4c86f1; opacity: 0.3; transparent: true; side: double');
        
        // Random position around the room
        const angle = i * (Math.PI * 2 / 3) + Math.random() * 0.5;
        const distance = 2 + Math.random();
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        beam.setAttribute('position', `${x} 2.5 ${z}`);
        
        // Random rotation for the beam
        const rotY = Math.random() * 360;
        beam.setAttribute('rotation', `90 ${rotY} 0`);
        
        // Add animation
        beam.setAttribute('animation', `property: rotation; to: 90 ${rotY + 360} 0; dur: ${15000 + i * 5000}; easing: linear; loop: true`);
        
        labElements.appendChild(beam);
      }
      
      // Add tony stark holographic workstation effect
      const workstation = document.createElement('a-entity');
      workstation.setAttribute('id', 'stark-workstation');
      workstation.setAttribute('position', '0 0 -1.5');
      
      // Add circular platform
      const platform = document.createElement('a-entity');
      platform.setAttribute('geometry', 'primitive: circle; radius: 0.5;');
      platform.setAttribute('rotation', '-90 0 0');
      platform.setAttribute('position', '0 0.01 0');
      platform.setAttribute('material', 'color: #4c86f1; opacity: 0.5; transparent: true');
      
      // Add animated tech circle
      const techCircle = document.createElement('a-entity');
      techCircle.setAttribute('geometry', 'primitive: ring; radiusInner: 0.48; radiusOuter: 0.5;');
      techCircle.setAttribute('rotation', '-90 0 0');
      techCircle.setAttribute('position', '0 0.02 0');
      techCircle.setAttribute('material', 'color: #4c86f1; opacity: 0.8; transparent: true');
      techCircle.setAttribute('animation', 'property: rotation; to: -90 360 0; dur: 10000; easing: linear; loop: true');
      
      workstation.appendChild(platform);
      workstation.appendChild(techCircle);
      
      // Add holographic globe
      const globe = document.createElement('a-entity');
      globe.setAttribute('geometry', 'primitive: sphere; radius: 0.3;');
      globe.setAttribute('position', '0 0.7 0');
      globe.setAttribute('material', 'color: #15ACCF; opacity: 0.6; transparent: true; wireframe: true');
      globe.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 20000; easing: linear; loop: true');
      
      workstation.appendChild(globe);
      
      labElements.appendChild(workstation);
      
      // Add to scene
      scene.appendChild(labElements);
    },
    
    removeLabElements: function() {
      const labElements = document.getElementById('lab-elements');
      if (labElements) {
        labElements.setAttribute('visible', false);
      }
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
    
    // Detect walls and obstacles in AR mode using Quest 3's Scene Understanding
    detectObstacles: function() {
      // This uses the WebXR Depth API for Quest 3 room mapping
      if (!this.hasARSession || !this.el.sceneEl.is('ar-mode')) {
        return;
      }
      
      console.log('Detecting obstacles in room');
      
      // Check if the depth sensing API is available
      if (navigator.xr && 'XRDepthInformation' in window) {
        console.log('Depth sensing API available, enabling obstacle detection');
        
        // Create visualization for detected surfaces
        this.createSafeZoneVisualization();
      } else {
        console.log('Depth sensing API not available, using simple safe zone');
        this.createSimpleSafeZone();
      }
    },
    
    createSafeZoneVisualization: function() {
      // Create container for visualizations
      const safeZone = document.createElement('a-entity');
      safeZone.setAttribute('id', 'safe-zone-visualization');
      
      // Create floor boundary
      const floorBoundary = document.createElement('a-entity');
      floorBoundary.setAttribute('geometry', 'primitive: ring; radiusInner: 1.95; radiusOuter: 2.0;');
      floorBoundary.setAttribute('rotation', '-90 0 0');
      floorBoundary.setAttribute('position', '0 0.02 0');
      floorBoundary.setAttribute('material', 'color: #4c86f1; opacity: 0.5; transparent: true');
      
      // Add pulsing animation
      floorBoundary.setAttribute('animation', 'property: geometry.radiusInner; to: 1.9; dur: 1000; dir: alternate; loop: true');
      floorBoundary.setAttribute('animation__2', 'property: geometry.radiusOuter; to: 2.05; dur: 1000; dir: alternate; loop: true');
      
      safeZone.appendChild(floorBoundary);
      
      // Create vertical grid markers
      for (let i = 0; i < 16; i++) {
        const angle = i * (Math.PI * 2 / 16);
        const x = Math.cos(angle) * 2;
        const z = Math.sin(angle) * 2;
        
        const marker = document.createElement('a-entity');
        marker.setAttribute('geometry', 'primitive: plane; width: 0.1; height: 0.5;');
        marker.setAttribute('position', `${x} 0.25 ${z}`);
        marker.setAttribute('rotation', `0 ${-angle * (180 / Math.PI)} 0`);
        marker.setAttribute('material', 'color: #4c86f1; opacity: 0.3; transparent: true; side: double');
        
        safeZone.appendChild(marker);
      }
      
      this.el.sceneEl.appendChild(safeZone);
    },
    
    createSimpleSafeZone: function() {
      // Create a simple safe zone visualization
      const safeZone = document.createElement('a-entity');
      safeZone.setAttribute('id', 'safe-zone');
      
      // Create a cylinder for the boundary
      safeZone.setAttribute('geometry', 'primitive: cylinder; radius: 2.0; height: 0.02;');
      safeZone.setAttribute('material', 'color: #4c86f1; opacity: 0.2; transparent: true');
      safeZone.setAttribute('position', '0 0.01 0');
      
      // Add pulsing animation
      safeZone.setAttribute('animation', 'property: material.opacity; to: 0.3; dur: 2000; dir: alternate; loop: true');
      
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