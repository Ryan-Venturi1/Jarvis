/* JARVIS Enhanced Surface Detector with Meta Quest 3 Optimizations */

// A-Frame component for detecting surfaces and placing virtual keyboards
AFRAME.registerComponent('enhanced-surface-detector', {
    schema: {
      minSurfaceArea: {type: 'number', default: 0.15}, // Minimum area in square meters
      detectionInterval: {type: 'number', default: 300}, // Milliseconds between detection attempts
      keyboardTemplate: {type: 'string', default: 'standard'}, // Keyboard template to use
      maxKeyboards: {type: 'number', default: 3}, // Maximum number of keyboards to place
      keyboardHeight: {type: 'number', default: 0.02}, // Height of keyboard above surface
      showDebugVisuals: {type: 'boolean', default: false} // Show debug visuals
    },
    
    init: function() {
      this.surfaces = [];
      this.detectedSurfaces = {};
      this.keyboards = [];
      this.active = false;
      this.sceneEl = this.el.sceneEl;
      this.camera = document.querySelector('#camera');
      this.lastDetectionTime = 0;
      this.detectionCount = 0;
      
      // Bind methods
      this.tick = AFRAME.utils.throttleTick(this.tick, this.data.detectionInterval, this);
      
      // Initialize keyboard templates
      this.initKeyboardTemplates();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Set up Quest 3 mesh detection if available
      this.setupMeshDetection();
      
      console.log('Enhanced Surface Detector initialized');
    },
    
    setupEventListeners: function() {
      // Set up event listeners for XR session
      this.sceneEl.addEventListener('enter-vr', this.onEnterVR.bind(this));
      this.sceneEl.addEventListener('exit-vr', this.onExitVR.bind(this));
      
      // Listen for hit test results
      this.sceneEl.addEventListener('hit-test-start', this.onHitTestStart.bind(this));
      this.sceneEl.addEventListener('hit-test-end', this.onHitTestEnd.bind(this));
      this.sceneEl.addEventListener('hit-test', this.onHitTest.bind(this));
      
      // Listen for surface detection toggle
      this.sceneEl.addEventListener('toggle-surface-detection', this.toggleDetection.bind(this));
      
      // Listen for mesh detection events (Quest 3 specific)
      this.sceneEl.addEventListener('scenemesh-added', this.onSceneMeshAdded.bind(this));
      
      // Listen for keyboard interaction events
      document.addEventListener('keydown', this.onKeyboardInput.bind(this));
    },
    
    setupMeshDetection: function() {
      // Check for WebXR mesh detection API (available on Quest 3)
      if (navigator.xr && this.sceneEl.hasLoaded) {
        this.setupMeshDetectionAPI();
      } else {
        this.sceneEl.addEventListener('loaded', () => {
          this.setupMeshDetectionAPI();
        });
      }
    },
    
    setupMeshDetectionAPI: function() {
      // Check if scene has xr-mesh-detection component (for Quest 3)
      if (!this.sceneEl.hasAttribute('xr-mesh-detection')) {
        if ('XRMeshProvider' in window || 'XRMeshDetector' in window) {
          console.log('WebXR Mesh Detection API available, enabling advanced surface detection');
          this.sceneEl.setAttribute('xr-mesh-detection', {
            enableMeshDetection: true
          });
        }
      }
    },
    
    onSceneMeshAdded: function(event) {
      // Process mesh data from Quest 3 scene understanding
      console.log('Scene mesh detected:', event.detail);
      
      const meshDetail = event.detail;
      if (meshDetail && meshDetail.pose && meshDetail.vertices) {
        // Analyze mesh to find flat surfaces
        this.analyzeMeshForSurfaces(meshDetail);
      }
    },
    
    analyzeMeshForSurfaces: function(meshDetail) {
      if (!meshDetail.vertices || meshDetail.vertices.length < 9) return; // Need at least 3 vertices
      
      // Extract vertices and compute normals
      const vertices = [];
      for (let i = 0; i < meshDetail.vertices.length; i += 3) {
        vertices.push(new THREE.Vector3(
          meshDetail.vertices[i],
          meshDetail.vertices[i + 1],
          meshDetail.vertices[i + 2]
        ));
      }
      
      // Group vertices into potential surfaces
      const potentialSurfaces = this.groupVerticesBySimilarNormals(vertices);
      
      // Process each potential surface
      potentialSurfaces.forEach(surface => {
        if (surface.area >= this.data.minSurfaceArea) {
          // Found a valid surface
          const surfaceId = `mesh-surface-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          
          this.detectedSurfaces[surfaceId] = {
            id: surfaceId,
            position: surface.center,
            normal: surface.normal,
            width: surface.width,
            depth: surface.depth,
            area: surface.area,
            lastSeen: Date.now(),
            hasKeyboard: false,
            confidence: 0.9, // High confidence for mesh detection
            type: 'mesh'
          };
          
          console.log(`New mesh surface detected: ${surfaceId}, area: ${surface.area.toFixed(2)}m²`);
          
          // Place keyboard on this surface if it's suitable
          this.evaluateSurfaceForKeyboard(this.detectedSurfaces[surfaceId]);
          
          // Show debug visuals
          if (this.data.showDebugVisuals) {
            this.showSurfaceDebugVisual(this.detectedSurfaces[surfaceId]);
          }
        }
      });
    },
    
    groupVerticesBySimilarNormals: function(vertices) {
      // Simplified algorithm to group vertices into planar surfaces
      // In a real implementation, this would use more sophisticated RANSAC or region growing
      
      const surfaces = [];
      const processed = new Set();
      
      // For each vertex triad, compute normals and group similar ones
      for (let i = 0; i < vertices.length - 2; i += 3) {
        if (processed.has(i)) continue;
        
        const v1 = vertices[i];
        const v2 = vertices[i + 1];
        const v3 = vertices[i + 2];
        
        // Compute face normal
        const edge1 = new THREE.Vector3().subVectors(v2, v1);
        const edge2 = new THREE.Vector3().subVectors(v3, v1);
        const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
        
        // Skip if not mostly horizontal (we want tables and surfaces)
        if (Math.abs(normal.y) < 0.7) continue;
        
        // Find all similar-oriented vertices
        const similarVertices = [v1, v2, v3];
        processed.add(i);
        processed.add(i + 1);
        processed.add(i + 2);
        
        for (let j = 0; j < vertices.length; j++) {
          if (processed.has(j)) continue;
          
          const v = vertices[j];
          // Check if vertex is coplanar with our surface
          const distToPlane = normal.dot(new THREE.Vector3().subVectors(v, v1));
          
          if (Math.abs(distToPlane) < 0.05) { // Threshold for coplanarity
            similarVertices.push(v);
            processed.add(j);
          }
        }
        
        // Calculate surface properties
        if (similarVertices.length >= 3) {
          // Calculate bounding box
          let minX = Infinity, maxX = -Infinity;
          let minY = Infinity, maxY = -Infinity;
          let minZ = Infinity, maxZ = -Infinity;
          
          similarVertices.forEach(v => {
            minX = Math.min(minX, v.x);
            maxX = Math.max(maxX, v.x);
            minY = Math.min(minY, v.y);
            maxY = Math.max(maxY, v.y);
            minZ = Math.min(minZ, v.z);
            maxZ = Math.max(maxZ, v.z);
          });
          
          const width = maxX - minX;
          const height = maxY - minY;
          const depth = maxZ - minZ;
          const area = width * depth;
          
          // Calculate center
          const center = new THREE.Vector3(
            (minX + maxX) / 2,
            (minY + maxY) / 2,
            (minZ + maxZ) / 2
          );
          
          surfaces.push({
            center: center,
            normal: normal,
            width: width,
            height: height,
            depth: depth,
            area: area,
            vertices: similarVertices
          });
        }
      }
      
      return surfaces;
    },
    
    onEnterVR: function() {
      // Start detection when entering VR
      this.active = true;
      
      // Check if we're in AR mode
      if (this.sceneEl.is('ar-mode')) {
        // Start hit testing
        this.startHitTesting();
      }
      
      // Reset surfaces array
      this.surfaces = [];
      
      // Start with detection count at 0
      this.detectionCount = 0;
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
      if (!this.sceneEl.is('ar-mode')) return;
      
      this.sceneEl.setAttribute('ar-hit-test', {
        target: '#hit-test-cursor',
        enabled: true
      });
      
      // Create cursor for hit testing if it doesn't exist
      if (!document.getElementById('hit-test-cursor')) {
        const cursor = document.createElement('a-entity');
        cursor.id = 'hit-test-cursor';
        cursor.setAttribute('position', '0 0 -1');
        cursor.setAttribute('visible', false);
        this.sceneEl.appendChild(cursor);
      }
      
      console.log('AR hit testing started');
    },
    
    stopHitTesting: function() {
      if (this.sceneEl.getAttribute('ar-hit-test')) {
        this.sceneEl.removeAttribute('ar-hit-test');
      }
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
        
        // Check if this is a horizontal surface (potential table)
        if (Math.abs(normal.y) > 0.7) {
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
      if (this.sceneEl.is('vr-mode') && !this.sceneEl.is('ar-mode')) {
        this.detectSurfacesWithRaycasting();
      }
      
      // Update keyboard positions relative to user
      this.updateKeyboards();
      
      // If we're using Meta Quest 3, request mesh detection periodically
      if (this.sceneEl.is('ar-mode') && this.detectionCount < 10) {
        // Limit mesh detection requests to avoid performance issues
        if (time - this.lastDetectionTime > 3000) { // 3 seconds between full scene scans
          this.requestSceneMeshUpdate();
          this.lastDetectionTime = time;
          this.detectionCount++;
        }
      }
    },
    
    requestSceneMeshUpdate: function() {
      // Request scene mesh update from Meta Quest 3
      this.sceneEl.emit('request-mesh-update');
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
        
        // Calculate surface area (simplified as rectangle)
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
              hasKeyboard: false,
              confidence: group.points.length / 20, // Confidence based on detection count
              type: 'hitTest'
            };
            
            console.log(`New surface detected: ${surfaceId}, area: ${area.toFixed(2)}m², confidence: ${this.detectedSurfaces[surfaceId].confidence.toFixed(2)}`);
            
            // Evaluate if we should place a keyboard on this surface
            this.evaluateSurfaceForKeyboard(this.detectedSurfaces[surfaceId]);
            
            // Show debug visuals
            if (this.data.showDebugVisuals) {
              this.showSurfaceDebugVisual(this.detectedSurfaces[surfaceId]);
            }
          } else {
            // Update existing surface data
            const surface = this.detectedSurfaces[surfaceId];
            surface.lastSeen = Date.now();
            surface.position.copy(avgPosition);
            surface.normal.copy(avgNormal);
            surface.width = width;
            surface.depth = depth;
            surface.area = area;
            
            // Increase confidence with more detections
            surface.confidence = Math.min(surface.confidence + 0.05, 1.0);
            
            // Update keyboard position if needed
            if (surface.hasKeyboard && surface.keyboardEntity) {
              this.updateKeyboardPosition(surface);
            }
          }
        }
      });
    },
    
    evaluateSurfaceForKeyboard: function(surface) {
      // Determine if we should place a keyboard on this surface
      
      // Skip if surface already has a keyboard
      if (surface.hasKeyboard) return;
      
      // Skip if surface is too small
      if (surface.area < this.data.minSurfaceArea) return;
      
      // Skip if confidence is too low
      if (surface.confidence < 0.6) return;
      
      // Skip if we already have too many keyboards
      if (this.keyboards.length >= this.data.maxKeyboards) {
        // Find the least recently used keyboard to replace
        let oldestKeyboard = null;
        let oldestTime = Date.now();
        
        Object.values(this.detectedSurfaces).forEach(s => {
          if (s.hasKeyboard && s.lastInteraction && s.lastInteraction < oldestTime) {
            oldestKeyboard = s;
            oldestTime = s.lastInteraction;
          }
        });
        
        // If we have an old keyboard and it hasn't been used recently, remove it
        if (oldestKeyboard && (Date.now() - oldestTime > 60000)) { // 1 minute without interaction
          this.removeKeyboard(oldestKeyboard);
        } else {
          // Otherwise, don't add a new keyboard
          return;
        }
      }
      
      // Check if surface is in front of user
      const cameraPos = new THREE.Vector3();
      const cameraDirZ = new THREE.Vector3(0, 0, -1);
      
      this.camera.object3D.getWorldPosition(cameraPos);
      cameraDirZ.applyQuaternion(this.camera.object3D.quaternion);
      
      const toSurface = new THREE.Vector3().subVectors(surface.position, cameraPos).normalize();
      const angle = toSurface.dot(cameraDirZ);
      
      // Only place keyboard if surface is somewhat in front of user (dot product > 0)
      if (angle > 0.3) {
        // Place keyboard on this surface
        this.placeKeyboard(surface);
      }
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
        const timeout = surface.type === 'mesh' ? 30000 : 10000; // Longer timeout for mesh surfaces
        
        if (now - surface.lastSeen > timeout) {
          // Remove keyboard if exists
          if (surface.hasKeyboard) {
            this.removeKeyboard(surface);
          }
          
          // Remove debug visual if exists
          if (surface.debugEntity && surface.debugEntity.parentNode) {
            surface.debugEntity.parentNode.removeChild(surface.debugEntity);
          }
          
          // Remove surface
          delete this.detectedSurfaces[id];
        }
      });
    },
    
    removeKeyboard: function(surface) {
      if (!surface.hasKeyboard || !surface.keyboardEntity) return;
      
      // Remove keyboard entity
      if (surface.keyboardEntity.parentNode) {
        surface.keyboardEntity.parentNode.removeChild(surface.keyboardEntity);
      }
      
      // Remove from keyboards array
      const index = this.keyboards.findIndex(k => k.id === surface.keyboardEntity.id);
      if (index !== -1) {
        this.keyboards.splice(index, 1);
      }
      
      // Update surface data
      surface.hasKeyboard = false;
      surface.keyboardEntity = null;
      
      // Emit event
      this.el.emit('keyboard-removed', {
        surfaceId: surface.id
      });
      
      console.log(`Removed keyboard from surface ${surface.id}`);
    },
    
    detectSurfacesWithRaycasting: function() {
      // Use raycasting to detect surfaces in VR mode
      // Cast rays downward from multiple positions
      const raycaster = new THREE.Raycaster();
      const cameraPosition = new THREE.Vector3();
      this.camera.object3D.getWorldPosition(cameraPosition);
      
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
          
          // Get all intersections with the floor or other objects
          const intersects = raycaster.intersectObjects(this.sceneEl.object3D.children, true);
          
          if (intersects.length > 0) {
            const hit = intersects[0];
            
            // Skip if hit is too close to ground
            if (hit.point.y < 0.3) continue;
            
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
    
    initKeyboardTemplates: function() {
      // Define keyboard templates for different uses
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
        },
        media: {
          width: 0.4,
          height: 0.15,
          keys: [
            // Media control layout
            { label: '⏮', x: -0.15, y: 0.05, action: 'media-prev' },
            { label: '⏵⏸', x: 0, y: 0.05, action: 'media-play', width: 0.08 },
            { label: '⏭', x: 0.15, y: 0.05, action: 'media-next' },
            
            { label: '🔇', x: -0.15, y: -0.05, action: 'volume-mute' },
            { label: '🔉', x: -0.05, y: -0.05, action: 'volume-down' },
            { label: '🔊', x: 0.05, y: -0.05, action: 'volume-up' },
            { label: '⚙', x: 0.15, y: -0.05, action: 'settings' }
          ],
          spaceBar: null
        }
      };
    },
    
    placeKeyboard: function(surface) {
      if (surface.hasKeyboard) return;
      
      // Create a new keyboard entity
      const keyboard = document.createElement('a-entity');
      keyboard.setAttribute('id', `keyboard-${Date.now()}`);
      keyboard.setAttribute('class', 'virtual-keyboard');
      
      // Position on surface with offset
      const position = surface.position.clone();
      const normal = surface.normal.clone();
      
      // Add a small offset in the direction of the normal
      position.add(normal.multiplyScalar(this.data.keyboardHeight));
      
      keyboard.setAttribute('position', position);
      
      // Orient to match surface normal
      const rotation = this.getNormalRotation(surface.normal);
      keyboard.setAttribute('rotation', rotation);
      
      // Create keyboard base
      const template = this.keyboardTemplates[this.data.keyboardTemplate];
      this.createKeyboardMesh(keyboard, template);
      
      // Add to scene
      this.sceneEl.appendChild(keyboard);
      
      // Store in keyboards array
      this.keyboards.push(keyboard);
      
      // Mark this surface as having a keyboard
      surface.hasKeyboard = true;
      surface.keyboardEntity = keyboard;
      surface.lastInteraction = Date.now();
      
      // Emit keyboard placed event
      this.el.emit('keyboard-placed', {
        position: position,
        surfaceId: surface.id,
        keyboardId: keyboard.id
      });
      
      // Create a screen above the keyboard
      this.createScreenAboveKeyboard(keyboard, position, normal, surface);
      
      console.log(`Placed keyboard on surface ${surface.id}`);
      
      return keyboard;
    },
    
    createKeyboardMesh: function(keyboard, template) {
      // Create keyboard base
      const base = document.createElement('a-entity');
      base.setAttribute('geometry', `primitive: box; width: ${template.width}; height: 0.01; depth: ${template.height}`);
      base.setAttribute('material', 'color: #222222; opacity: 0.9; transparent: true; emissive: #111111; emissiveIntensity: 0.2');
      keyboard.appendChild(base);
      
      // Add glow effect
      const glow = document.createElement('a-entity');
      glow.setAttribute('geometry', `primitive: box; width: ${template.width + 0.02}; height: 0.005; depth: ${template.height + 0.02}`);
      glow.setAttribute('material', 'color: #4c86f1; opacity: 0.4; transparent: true; emissive: #4c86f1; emissiveIntensity: 0.5');
      glow.setAttribute('position', '0 -0.005 0');
      keyboard.appendChild(glow);
      
      // Create keys
      if (template.keys) {
        template.keys.forEach(key => {
          const keyWidth = key.width || 0.04;
          const keyHeight = 0.04;
          const keyEntity = document.createElement('a-entity');
          keyEntity.setAttribute('geometry', `primitive: box; width: ${keyWidth}; height: 0.01; depth: ${keyHeight}`);
          keyEntity.setAttribute('material', 'color: #444444; opacity: 0.9; transparent: true; emissive: #222222; emissiveIntensity: 0.2');
          keyEntity.setAttribute('position', `${key.x} 0.01 ${key.y}`);
          keyEntity.setAttribute('data-key', key.label);
          keyEntity.setAttribute('data-action', key.action || 'key');
          
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
            this.handleKeyPress(key.label, key.action);
            
            // Visual feedback
            keyEntity.setAttribute('material', 'color: #4c86f1; emissiveIntensity: 0.5');
            setTimeout(() => {
              keyEntity.setAttribute('material', 'color: #444444; emissiveIntensity: 0.2');
            }, 200);
            
            // Update last interaction time
            const surfaceId = keyboard.getAttribute('data-surface-id');
            if (this.detectedSurfaces[surfaceId]) {
              this.detectedSurfaces[surfaceId].lastInteraction = Date.now();
            }
          });
          
          keyboard.appendChild(keyEntity);
        });
      }
      
      // Create space bar if defined
      if (template.spaceBar) {
        const space = document.createElement('a-entity');
        space.setAttribute('geometry', `primitive: box; width: ${template.spaceBar.width}; height: 0.01; depth: ${template.spaceBar.height}`);
        space.setAttribute('material', 'color: #444444; opacity: 0.9; transparent: true; emissive: #222222; emissiveIntensity: 0.2');
        space.setAttribute('position', `${template.spaceBar.x} 0.01 ${template.spaceBar.y}`);
        space.setAttribute('class', 'keyboard-key');
        space.setAttribute('data-key', ' ');
        space.setAttribute('data-action', 'key');
        
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
          
          // Visual feedback
          space.setAttribute('material', 'color: #4c86f1; emissiveIntensity: 0.5');
          setTimeout(() => {
            space.setAttribute('material', 'color: #444444; emissiveIntensity: 0.2');
          }, 200);
          
          // Update last interaction time
          const surfaceId = keyboard.getAttribute('data-surface-id');
          if (this.detectedSurfaces[surfaceId]) {
            this.detectedSurfaces[surfaceId].lastInteraction = Date.now();
          }
        });
        
        keyboard.appendChild(space);
      }
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
    
    handleKeyPress: function(key, action) {
      // Handle keyboard input
      console.log(`Key pressed: ${key}, Action: ${action || 'key'}`);
      
      // Dispatch a keyboard event
      this.el.emit('keyboard-input', { 
        key: key,
        action: action || 'key',
        timestamp: Date.now()
      });
      
      // If this is a key action, send to active screen
      if (!action || action === 'key') {
        this.sendKeyToActiveScreen(key);
      } else {
        // Handle special actions
        this.handleSpecialAction(action);
      }
    },
    
    sendKeyToActiveScreen: function(key) {
      // Send key press to the active virtual screen
      const activeScreen = document.querySelector('.virtual-screen.active');
      if (activeScreen) {
        activeScreen.emit('keyboard-input', { key: key });
      }
    },
    
    handleSpecialAction: function(action) {
      // Handle special keyboard actions
      switch(action) {
        case 'media-play':
          this.el.emit('media-control', { action: 'play-pause' });
          break;
        case 'media-next':
          this.el.emit('media-control', { action: 'next' });
          break;
        case 'media-prev':
          this.el.emit('media-control', { action: 'previous' });
          break;
        case 'volume-up':
          this.el.emit('media-control', { action: 'volume-up' });
          break;
        case 'volume-down':
          this.el.emit('media-control', { action: 'volume-down' });
          break;
        case 'volume-mute':
          this.el.emit('media-control', { action: 'volume-mute' });
          break;
        case 'settings':
          this.el.emit('open-settings');
          break;
      }
    },
    
    onKeyboardInput: function(event) {
      // Handle keyboard input from physical keyboard
      // Only process if we're in VR and not typing in an input field
      if (!this.sceneEl.is('vr-mode')) return;
      if (document.activeElement && 
         (document.activeElement.tagName === 'INPUT' || 
          document.activeElement.tagName === 'TEXTAREA' ||
          document.activeElement.isContentEditable)) {
        return;
      }
      
      // Send key event to active screen
      const activeScreen = document.querySelector('.virtual-screen.active');
      if (activeScreen) {
        activeScreen.emit('keyboard-input', { 
          key: event.key,
          keyCode: event.keyCode,
          code: event.code
        });
      }
    },
    
    createScreenAboveKeyboard: function(keyboard, position, normal, surface) {
      // Create a screen above the keyboard
      
      // Calculate screen position
      const screenPosition = position.clone();
      
      // Add offset in the normal direction and upward
      const upVector = new THREE.Vector3(0, 1, 0);
      upVector.projectOnPlane(normal).normalize().multiplyScalar(0.3);
      
      screenPosition.add(upVector);
      
      // Emit event to create screen
      this.el.sceneEl.emit('create-screen', {
        position: screenPosition,
        template: 'browser',
        title: 'Keyboard Screen',
        surface: surface.id
      });
      
      // Store relationship
      surface.associatedScreenId = `screen-${Date.now()}`;
    },
    
    updateKeyboards: function() {
      // Update visibility and position of keyboards based on user position
      const cameraPos = new THREE.Vector3();
      this.camera.object3D.getWorldPosition(cameraPos);
      
      this.keyboards.forEach(keyboard => {
        const keyboardId = keyboard.id;
        
        // Find associated surface
        let surface = null;
        Object.values(this.detectedSurfaces).forEach(s => {
          if (s.hasKeyboard && s.keyboardEntity && s.keyboardEntity.id === keyboardId) {
            surface = s;
          }
        });
        
        if (!surface) return;
        
        // Check if keyboard is usable - in front and reasonably close
        const keyboardPos = new THREE.Vector3();
        keyboard.object3D.getWorldPosition(keyboardPos);
        
        const distance = keyboardPos.distanceTo(cameraPos);
        const direction = new THREE.Vector3().subVectors(keyboardPos, cameraPos).normalize();
        const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.object3D.quaternion);
        const inFrontFactor = direction.dot(cameraForward);
        
        // Show keyboard if in front and within reasonable distance
        const isVisible = inFrontFactor > 0.3 && distance < 2.0;
        keyboard.setAttribute('visible', isVisible);
        
        // Update interaction state
        if (isVisible) {
          surface.isVisible = true;
          
          // Make this the active keyboard if it's the closest one in view
          if (distance < (surface.activeDistance || Infinity) && inFrontFactor > 0.7) {
            surface.activeDistance = distance;
            this.setActiveKeyboard(surface);
          }
        } else {
          surface.isVisible = false;
          surface.activeDistance = Infinity;
        }
      });
    },
    
    setActiveKeyboard: function(surface) {
      // Set this keyboard as the active one
      Object.values(this.detectedSurfaces).forEach(s => {
        if (s.hasKeyboard && s.keyboardEntity) {
          const isActive = s.id === surface.id;
          
          // Add or remove active class
          if (isActive) {
            s.keyboardEntity.classList.add('active-keyboard');
            
            // Add a subtle glow or highlight
            const glow = s.keyboardEntity.querySelector('[material]');
            if (glow) {
              glow.setAttribute('material', 'emissiveIntensity', 0.7);
            }
          } else {
            s.keyboardEntity.classList.remove('active-keyboard');
            
            // Remove highlight
            const glow = s.keyboardEntity.querySelector('[material]');
            if (glow) {
              glow.setAttribute('material', 'emissiveIntensity', 0.3);
            }
          }
        }
      });
    },
    
    updateKeyboardPosition: function(surface) {
      if (!surface.hasKeyboard || !surface.keyboardEntity) return;
      
      // Update keyboard position to match surface
      const position = surface.position.clone();
      const normal = surface.normal.clone();
      
      // Add a small offset in the direction of the normal
      position.add(normal.multiplyScalar(this.data.keyboardHeight));
      
      surface.keyboardEntity.setAttribute('position', position);
      
      // Update rotation to match surface normal
      const rotation = this.getNormalRotation(surface.normal);
      surface.keyboardEntity.setAttribute('rotation', rotation);
    },
    
    showSurfaceDebugVisual: function(surface) {
      if (!this.data.showDebugVisuals) return;
      
      // Remove existing debug visual
      if (surface.debugEntity && surface.debugEntity.parentNode) {
        surface.debugEntity.parentNode.removeChild(surface.debugEntity);
      }
      
      // Create debug visualization
      const debugEntity = document.createElement('a-entity');
      debugEntity.setAttribute('id', `debug-surface-${surface.id}`);
      
      // Create a plane to show the surface
      const plane = document.createElement('a-plane');
      plane.setAttribute('width', Math.max(0.2, surface.width));
      plane.setAttribute('height', Math.max(0.2, surface.depth));
      plane.setAttribute('position', surface.position);
      
      // Set rotation to match surface normal
      const rotation = this.getNormalRotation(surface.normal);
      plane.setAttribute('rotation', rotation);
      
      // Set material based on surface confidence
      const confidence = surface.confidence || 0.5;
      const color = surface.hasKeyboard ? '#4CAF50' : `rgba(76, 134, 241, ${confidence.toFixed(2)})`;
      plane.setAttribute('material', `color: ${color}; opacity: 0.3; transparent: true; side: double`);
      
      debugEntity.appendChild(plane);
      
      // Add text label with surface info
      const label = document.createElement('a-text');
      label.setAttribute('value', `Surface ${surface.id.substring(0, 8)}\nArea: ${surface.area.toFixed(2)}m²\nConfidence: ${(surface.confidence || 0).toFixed(2)}`);
      label.setAttribute('align', 'center');
      label.setAttribute('position', `${surface.position.x} ${surface.position.y + 0.1} ${surface.position.z}`);
      label.setAttribute('scale', '0.1 0.1 0.1');
      label.setAttribute('color', '#FFFFFF');
      label.setAttribute('look-at', '#camera');
      
      debugEntity.appendChild(label);
      
      // Add to scene
      this.sceneEl.appendChild(debugEntity);
      
      // Store reference
      surface.debugEntity = debugEntity;
    }
});