/* JARVIS Enhanced Surface Detector */

// A-Frame component for detecting surfaces and placing virtual keyboards
AFRAME.registerComponent('surface-detector', {
    schema: {
      minSurfaceArea: {type: 'number', default: 0.2}, // Minimum area in square meters
      detectionInterval: {type: 'number', default: 500}, // Milliseconds between detection attempts
      keyboardTemplate: {type: 'string', default: 'standard'} // Keyboard template to use
    },
    
    init: function() {
      this.surfaces = [];
      this.detectedSurfaces = {};
      this.keyboards = [];
      this.active = false;
      this.lastDetectionTime = 0;
      
      // Bind methods
      this.tick = AFRAME.utils.throttleTick(this.tick, this.data.detectionInterval, this);
      
      // Initialize keyboard templates
      this.keyboardTemplates = {
        standard: {
          width: 0.6,
          height: 0.2,
          keys: [
            // Row 1 (numbers)
            { label: '1', x: -0.25, y: 0.075 },
            { label: '2', x: -0.2, y: 0.075 },
            { label: '3', x: -0.15, y: 0.075 },
            { label: '4', x: -0.1, y: 0.075 },
            { label: '5', x: -0.05, y: 0.075 },
            { label: '6', x: 0, y: 0.075 },
            { label: '7', x: 0.05, y: 0.075 },
            { label: '8', x: 0.1, y: 0.075 },
            { label: '9', x: 0.15, y: 0.075 },
            { label: '0', x: 0.2, y: 0.075 },
            { label: 'DEL', x: 0.25, y: 0.075, width: 0.06 },
            
            // Row 2
            { label: 'Q', x: -0.25, y: 0.025 },
            { label: 'W', x: -0.2, y: 0.025 },
            { label: 'E', x: -0.15, y: 0.025 },
            { label: 'R', x: -0.1, y: 0.025 },
            { label: 'T', x: -0.05, y: 0.025 },
            { label: 'Y', x: 0, y: 0.025 },
            { label: 'U', x: 0.05, y: 0.025 },
            { label: 'I', x: 0.1, y: 0.025 },
            { label: 'O', x: 0.15, y: 0.025 },
            { label: 'P', x: 0.2, y: 0.025 },
            { label: '/', x: 0.25, y: 0.025 },
            
            // Row 3
            { label: 'A', x: -0.25, y: -0.025 },
            { label: 'S', x: -0.2, y: -0.025 },
            { label: 'D', x: -0.15, y: -0.025 },
            { label: 'F', x: -0.1, y: -0.025 },
            { label: 'G', x: -0.05, y: -0.025 },
            { label: 'H', x: 0, y: -0.025 },
            { label: 'J', x: 0.05, y: -0.025 },
            { label: 'K', x: 0.1, y: -0.025 },
            { label: 'L', x: 0.15, y: -0.025 },
            { label: ';', x: 0.2, y: -0.025 },
            { label: '\'', x: 0.25, y: -0.025 },
            
            // Row 4
            { label: 'Z', x: -0.25, y: -0.075 },
            { label: 'X', x: -0.2, y: -0.075 },
            { label: 'C', x: -0.15, y: -0.075 },
            { label: 'V', x: -0.1, y: -0.075 },
            { label: 'B', x: -0.05, y: -0.075 },
            { label: 'N', x: 0, y: -0.075 },
            { label: 'M', x: 0.05, y: -0.075 },
            { label: ',', x: 0.1, y: -0.075 },
            { label: '.', x: 0.15, y: -0.075 },
            { label: 'ENTER', x: 0.225, y: -0.075, width: 0.1 }
          ],
          spaceBar: { x: 0, y: -0.125, width: 0.5, height: 0.04 }
        },
        compact: {
          width: 0.4,
          height: 0.15,
          keys: [
            // Simplified layout with fewer keys
            // Row 1
            { label: 'Q', x: -0.175, y: 0.05 },
            { label: 'W', x: -0.125, y: 0.05 },
            { label: 'E', x: -0.075, y: 0.05 },
            { label: 'R', x: -0.025, y: 0.05 },
            { label: 'T', x: 0.025, y: 0.05 },
            { label: 'Y', x: 0.075, y: 0.05 },
            { label: 'U', x: 0.125, y: 0.05 },
            { label: 'I', x: 0.175, y: 0.05 },
            
            // Row 2
            { label: 'A', x: -0.175, y: 0 },
            { label: 'S', x: -0.125, y: 0 },
            { label: 'D', x: -0.075, y: 0 },
            { label: 'F', x: -0.025, y: 0 },
            { label: 'G', x: 0.025, y: 0 },
            { label: 'H', x: 0.075, y: 0 },
            { label: 'J', x: 0.125, y: 0 },
            { label: 'K', x: 0.175, y: 0 },
            
            // Row 3
            { label: 'Z', x: -0.175, y: -0.05 },
            { label: 'X', x: -0.125, y: -0.05 },
            { label: 'C', x: -0.075, y: -0.05 },
            { label: 'V', x: -0.025, y: -0.05 },
            { label: 'B', x: 0.025, y: -0.05 },
            { label: 'N', x: 0.075, y: -0.05 },
            { label: 'M', x: 0.125, y: -0.05 },
            { label: 'DEL', x: 0.175, y: -0.05 }
          ],
          spaceBar: { x: 0, y: -0.1, width: 0.3, height: 0.04 }
        }
      };
      
      // Set up event listeners for XR session
      this.el.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
      this.el.sceneEl.addEventListener('exit-vr', this.onExitVR.bind(this));
      
      // Listen for hit test results
      this.el.sceneEl.addEventListener('hit-test-start', this.onHitTestStart.bind(this));
      this.el.sceneEl.addEventListener('hit-test-end', this.onHitTestEnd.bind(this));
      this.el.sceneEl.addEventListener('hit-test', this.onHitTest.bind(this));
      
      // Listen for surface detection toggle
      this.el.sceneEl.addEventListener('toggle-surface-detection', this.toggleDetection.bind(this));
      
      console.log('Surface detector initialized');
    },
    
    onEnterVR: function() {
      // Start detection when entering VR
      this.active = true;
      
      // Check if we're in AR mode
      if (this.el.sceneEl.is('ar-mode')) {
        // Start hit testing
        this.startHitTesting();
      }
    },
    
    onExitVR: function() {
      // Stop detection when exiting VR
      this.active = false;
      this.stopHitTesting();
      
      // Hide all keyboards
      this.keyboards.forEach(keyboard => {
        keyboard.setAttribute('visible', false);
      });
    },
    
    toggleDetection: function(event) {
      const enabled = event.detail.enabled !== undefined ? event.detail.enabled : !this.active;
      this.active = enabled;
      
      if (this.active) {
        this.startHitTesting();
      } else {
        this.stopHitTesting();
      }
      
      console.log(`Surface detection ${this.active ? 'enabled' : 'disabled'}`);
    },
    
    startHitTesting: function() {
      if (!this.el.sceneEl.is('ar-mode')) return;
      
      this.el.sceneEl.setAttribute('ar-hit-test', {
        target: '#cursor',
        enabled: true
      });
      
      // Create cursor for hit testing
      if (!document.getElementById('cursor')) {
        const cursor = document.createElement('a-entity');
        cursor.id = 'cursor';
        cursor.setAttribute('position', '0 0 -1');
        cursor.setAttribute('visible', false);
        this.el.sceneEl.appendChild(cursor);
      }
      
      console.log('AR hit testing started');
    },
    
    stopHitTesting: function() {
      this.el.sceneEl.removeAttribute('ar-hit-test');
    },
    
    onHitTestStart: function() {
      console.log('Hit test started');
    },
    
    onHitTestEnd: function() {
      console.log('Hit test ended');
    },
    
    onHitTest: function(event) {
      if (!this.active) return;
      
      const hitResult = event.detail;
      if (hitResult && hitResult.length > 0) {
        // We have a hit on a surface
        const hit = hitResult[0];
        const point = hit.point;
        const normal = hit.normal;
        
        // Check if this is a horizontal surface (table)
        if (Math.abs(normal.y) > 0.8) {
          // Add to surfaces array
          this.surfaces.push({
            point: point,
            normal: normal,
            timestamp: Date.now()
          });
          
          // Process surfaces and look for stable ones
          this.processSurfaces();
        }
      }
    },
    
    tick: function(time, delta) {
      if (!this.active) return;
      
      // Cleanup old surface detections
      this.cleanupSurfaces();
      
      // If in non-AR VR mode, use raycasting for surface detection
      if (this.el.sceneEl.is('vr-mode') && !this.el.sceneEl.is('ar-mode')) {
        this.detectSurfacesWithRaycasting();
      }
      
      // Update keyboard positions relative to user
      this.updateKeyboardPositions();
    },
    
    processSurfaces: function() {
      // Group nearby surface detections
      const surfaceGroups = this.groupSurfaces();
      
      // Process each group to find stable surfaces
      surfaceGroups.forEach(group => {
        if (group.points.length < 5) return; // Need at least 5 detections
        
        // Calculate average position and normal
        const avgPosition = new THREE.Vector3();
        const avgNormal = new THREE.Vector3();
        
        group.points.forEach(surface => {
          avgPosition.add(surface.point);
          avgNormal.add(surface.normal);
        });
        
        avgPosition.divideScalar(group.points.length);
        avgNormal.divideScalar(group.points.length).normalize();
        
        // Calculate surface area (simplified as square)
        const width = group.maxX - group.minX;
        const depth = group.maxZ - group.minZ;
        const area = width * depth;
        
        // Check if area is large enough
        if (area > this.data.minSurfaceArea) {
          // Generate unique ID for this surface
          const surfaceId = `surface-${Math.round(avgPosition.x * 100)}-${Math.round(avgPosition.y * 100)}-${Math.round(avgPosition.z * 100)}`;
          
          // Check if we already detected this surface
          if (!this.detectedSurfaces[surfaceId]) {
            this.detectedSurfaces[surfaceId] = {
              id: surfaceId,
              position: avgPosition,
              normal: avgNormal,
              width: width,
              depth: depth,
              area: area,
              lastSeen: Date.now(),
              hasKeyboard: false
            };
            
            console.log(`New surface detected: ${surfaceId}, area: ${area.toFixed(2)}m²`);
            
            // Place keyboard on this surface
            this.placeKeyboard(this.detectedSurfaces[surfaceId]);
          } else {
            // Update existing surface data
            this.detectedSurfaces[surfaceId].lastSeen = Date.now();
            this.detectedSurfaces[surfaceId].position.copy(avgPosition);
            this.detectedSurfaces[surfaceId].normal.copy(avgNormal);
            this.detectedSurfaces[surfaceId].width = width;
            this.detectedSurfaces[surfaceId].depth = depth;
            this.detectedSurfaces[surfaceId].area = area;
          }
        }
      });
    },
    
    groupSurfaces: function() {
      // Group surfaces that are close together
      const groups = [];
      const groupThreshold = 0.1; // 10cm threshold
      
      this.surfaces.forEach(surface => {
        const point = surface.point;
        
        // Find or create group
        let assigned = false;
        for (let i = 0; i < groups.length; i++) {
          const group = groups[i];
          const dist = point.distanceTo(group.center);
          
          if (dist < groupThreshold) {
            group.points.push(surface);
            
            // Update center
            group.center.copy(point).add(group.center).multiplyScalar(0.5);
            
            // Update bounds
            group.minX = Math.min(group.minX, point.x);
            group.maxX = Math.max(group.maxX, point.x);
            group.minY = Math.min(group.minY, point.y);
            group.maxY = Math.max(group.maxY, point.y);
            group.minZ = Math.min(group.minZ, point.z);
            group.maxZ = Math.max(group.maxZ, point.z);
            
            assigned = true;
            break;
          }
        }
        
        if (!assigned) {
          // Create new group
          groups.push({
            points: [surface],
            center: point.clone(),
            minX: point.x,
            maxX: point.x,
            minY: point.y,
            maxY: point.y,
            minZ: point.z,
            maxZ: point.z
          });
        }
      });
      
      return groups;
    },
    
    cleanupSurfaces: function() {
      // Remove old surface detections
      const now = Date.now();
      this.surfaces = this.surfaces.filter(surface => {
        return now - surface.timestamp < 5000; // Keep last 5 seconds
      });
      
      // Clean up old detected surfaces
      Object.keys(this.detectedSurfaces).forEach(id => {
        const surface = this.detectedSurfaces[id];
        if (now - surface.lastSeen > 10000) { // 10 seconds timeout
          // Remove keyboard if exists
          if (surface.keyboardId) {
            const keyboard = document.getElementById(surface.keyboardId);
            if (keyboard && keyboard.parentNode) {
              keyboard.parentNode.removeChild(keyboard);
              
              // Remove from keyboards array
              const index = this.keyboards.findIndex(k => k.id === surface.keyboardId);
              if (index !== -1) {
                this.keyboards.splice(index, 1);
              }
            }
          }
          
          // Remove surface
          delete this.detectedSurfaces[id];
        }
      });
    },
    
    detectSurfacesWithRaycasting: function() {
      // Use raycasting to detect surfaces in VR mode
      // Cast rays downward from multiple positions
      const raycaster = new THREE.Raycaster();
      const camera = document.querySelector('#camera').object3D;
      const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
      
      // Cast rays in a grid pattern
      const gridSize = 3;
      const gridSpacing = 0.3;
      
      for (let x = -gridSize; x <= gridSize; x++) {
        for (let z = -gridSize; z <= gridSize; z++) {
          // Skip center point to avoid detecting directly under the user
          if (x === 0 && z === 0) continue;
          
          // Calculate ray origin
          const origin = new THREE.Vector3(
            cameraPosition.x + x * gridSpacing,
            cameraPosition.y,
            cameraPosition.z + z * gridSpacing
          );
          
          // Direction is down
          const direction = new THREE.Vector3(0, -1, 0);
          
          // Set up raycaster
          raycaster.set(origin, direction);
          
          // Get all intersections with the floor
          const intersects = raycaster.intersectObject(document.querySelector('#floor').object3D, true);
          
          if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Add to surfaces array
            this.surfaces.push({
              point: hit.point,
              normal: hit.face ? hit.face.normal : new THREE.Vector3(0, 1, 0),
              timestamp: Date.now()
            });
          }
        }
      }
    },
    
    placeKeyboard: function(surface) {
      if (surface.hasKeyboard) return;
      
      // Check if we already have too many keyboards
      if (this.keyboards.length >= 3) {
        // Remove oldest keyboard
        const oldestKeyboard = this.keyboards.shift();
        if (oldestKeyboard.parentNode) {
          oldestKeyboard.parentNode.removeChild(oldestKeyboard);
        }
      }
      
      // Create a new keyboard entity
      const keyboard = document.createElement('a-entity');
      keyboard.setAttribute('id', `keyboard-${Date.now()}`);
      keyboard.setAttribute('class', 'virtual-keyboard');
      
      // Position on surface
      const position = surface.position.clone();
      keyboard.setAttribute('position', position);
      
      // Orient to match surface normal
      const rotation = this.getNormalRotation(surface.normal);
      keyboard.setAttribute('rotation', rotation);
      
      // Create keyboard base
      const template = this.keyboardTemplates[this.data.keyboardTemplate];
      this.createKeyboardMesh(keyboard, template);
      
      // Add to scene
      this.el.sceneEl.appendChild(keyboard);
      
      // Store in keyboards array
      this.keyboards.push(keyboard);
      
      // Mark this surface as having a keyboard
      surface.hasKeyboard = true;
      surface.keyboardId = keyboard.id;
      
      // Emit keyboard placed event
      this.el.emit('keyboard-placed', {
        position: position,
        surfaceId: surface.id,
        keyboardId: keyboard.id
      });
      
      // Create a screen above the keyboard
      this.createScreenAboveKeyboard(keyboard, position);
      
      return keyboard;
    },
    
    createKeyboardMesh: function(keyboard, template) {
      // Create keyboard base
      const base = document.createElement('a-entity');
      base.setAttribute('geometry', `primitive: box; width: ${template.width}; height: 0.01; depth: ${template.height}`);
      base.setAttribute('material', 'color: #222222; opacity: 0.9; transparent: true');
      keyboard.appendChild(base);
      
      // Add glow effect
      const glow = document.createElement('a-entity');
      glow.setAttribute('geometry', `primitive: box; width: ${template.width + 0.02}; height: 0.005; depth: ${template.height + 0.02}`);
      glow.setAttribute('material', 'color: #4c86f1; opacity: 0.4; transparent: true; emissive: #4c86f1; emissiveIntensity: 0.5');
      glow.setAttribute('position', '0 -0.005 0');
      keyboard.appendChild(glow);
      
      // Create keys
      template.keys.forEach(key => {
        const keyWidth = key.width || 0.04;
        const keyHeight = 0.04;
        const keyEntity = document.createElement('a-entity');
        keyEntity.setAttribute('geometry', `primitive: box; width: ${keyWidth}; height: 0.01; depth: ${keyHeight}`);
        keyEntity.setAttribute('material', 'color: #444444; opacity: 0.9; transparent: true');
        keyEntity.setAttribute('position', `${key.x} 0.01 ${key.y}`);
        
        // Add key label
        const keyLabel = document.createElement('a-text');
        keyLabel.setAttribute('value', key.label);
        keyLabel.setAttribute('align', 'center');
        keyLabel.setAttribute('color', '#ffffff');
        keyLabel.setAttribute('scale', '0.05 0.05 0.05');
        keyLabel.setAttribute('position', '0 0.01 0');
        keyLabel.setAttribute('rotation', '-90 0 0');
        keyEntity.appendChild(keyLabel);
        
        // Add click handler
        keyEntity.setAttribute('class', 'keyboard-key');
        keyEntity.addEventListener('click', () => {
          this.handleKeyPress(key.label);
        });
        
        keyboard.appendChild(keyEntity);
      });
      
      // Create space bar
      const space = document.createElement('a-entity');
      space.setAttribute('geometry', `primitive: box; width: ${template.spaceBar.width}; height: 0.01; depth: ${template.spaceBar.height}`);
      space.setAttribute('material', 'color: #444444; opacity: 0.9; transparent: true');
      space.setAttribute('position', `${template.spaceBar.x} 0.01 ${template.spaceBar.y}`);
      space.setAttribute('class', 'keyboard-key');
      
      // Add space label
      const spaceLabel = document.createElement('a-text');
      spaceLabel.setAttribute('value', 'SPACE');
      spaceLabel.setAttribute('align', 'center');
      spaceLabel.setAttribute('color', '#ffffff');
      spaceLabel.setAttribute('scale', '0.05 0.05 0.05');
      spaceLabel.setAttribute('position', '0 0.01 0');
      spaceLabel.setAttribute('rotation', '-90 0 0');
      space.appendChild(spaceLabel);
      
      // Add click handler
      space.addEventListener('click', () => {
        this.handleKeyPress(' ');
      });
      
      keyboard.appendChild(space);
    },
    
    getNormalRotation: function(normal) {
      // Calculate rotation to orient along surface normal
      const defaultUp = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, normal);
      const euler = new THREE.Euler().setFromQuaternion(quaternion);
      
      // Convert to degrees
      return {
        x: THREE.MathUtils.radToDeg(euler.x),
        y: THREE.MathUtils.radToDeg(euler.y),
        z: THREE.MathUtils.radToDeg(euler.z)
      };
    },
    
    handleKeyPress: function(key) {
      // Handle keyboard input
      console.log(`Key pressed: ${key}`);
      
      // Dispatch a keyboard event
      this.el.emit('keyboard-input', { key: key });
      
      // Visual feedback (future enhancement)
    },
    
    createScreenAboveKeyboard: function(keyboard, position) {
      // Create a screen above the keyboard
      this.el.sceneEl.emit('create-screen', {
        position: {
          x: position.x,
          y: position.y + 0.4,
          z: position.z
        },
        template: 'browser',
        title: 'Keyboard Screen'
      });
    },
    
    updateKeyboardPositions: function() {
      // Update visibility of keyboards based on user position
      const camera = document.querySelector('#camera').object3D;
      const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
      const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      
      this.keyboards.forEach(keyboard => {
        const keyboardPosition = keyboard.getAttribute('position');
        const direction = new THREE.Vector3(
          keyboardPosition.x - cameraPosition.x,
          keyboardPosition.y - cameraPosition.y,
          keyboardPosition.z - cameraPosition.z
        ).normalize();
        
        // Calculate dot product to check if keyboard is in front of user
        const dot = cameraForward.dot(direction);
        
        // Show/hide based on position and distance
        const distance = new THREE.Vector3(
          keyboardPosition.x, keyboardPosition.y, keyboardPosition.z
        ).distanceTo(cameraPosition);
        
        // Only show if in front and within reasonable distance
        keyboard.setAttribute('visible', dot > 0 && distance < 3);
      });
    }
  });