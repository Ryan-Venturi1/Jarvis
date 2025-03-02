/* JARVIS WebVR Custom Components */

// Register A-Frame components
AFRAME.registerComponent('draggable', {
    schema: {
      active: {default: true}
    },
    
    init: function() {
      this.position = new THREE.Vector3();
      this.dragStartPosition = new THREE.Vector3();
      this.handStartPosition = new THREE.Vector3();
      this.isDragging = false;
      
      // Get access to hand controllers
      this.leftHand = document.getElementById('left-hand');
      this.rightHand = document.getElementById('right-hand');
      
      // Set up event listeners
      this.onGripDown = this.onGripDown.bind(this);
      this.onGripUp = this.onGripUp.bind(this);
      this.onDrag = this.onDrag.bind(this);
      
      this.el.addEventListener('gripdown', this.onGripDown);
      this.el.addEventListener('gripup', this.onGripUp);
    },
    
    onGripDown: function(e) {
      if (!this.data.active) return;
      
      this.isDragging = true;
      this.dragStartPosition.copy(this.el.object3D.position);
      
      // Check which hand triggered the event
      const hand = e.detail.hand === 'left' ? this.leftHand : this.rightHand;
      this.activeHand = hand;
      this.handStartPosition.copy(hand.object3D.position);
      
      // Set up drag event
      this.activeHand.addEventListener('move', this.onDrag);
      
      // Visual feedback
      this.el.setAttribute('material', 'emissive', '#4c86f1');
    },
    
    onGripUp: function() {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      
      if (this.activeHand) {
        this.activeHand.removeEventListener('move', this.onDrag);
        this.activeHand = null;
      }
      
      // Visual feedback
      this.el.setAttribute('material', 'emissive', '#111111');
    },
    
    onDrag: function() {
      if (!this.isDragging || !this.activeHand) return;
      
      // Calculate position difference from grip start
      const currentHandPosition = this.activeHand.object3D.position;
      const deltaPosition = new THREE.Vector3().subVectors(
        currentHandPosition, this.handStartPosition
      );
      
      // Apply position change to object
      this.position.copy(this.dragStartPosition).add(deltaPosition);
      this.el.object3D.position.copy(this.position);
    },
    
    remove: function() {
      this.el.removeEventListener('gripdown', this.onGripDown);
      this.el.removeEventListener('gripup', this.onGripUp);
      
      if (this.activeHand) {
        this.activeHand.removeEventListener('move', this.onDrag);
      }
    }
  });
  
  // Resizable component for screens
  AFRAME.registerComponent('resizable', {
    schema: {
      minScale: {default: 0.2},
      maxScale: {default: 2.0},
      scaleStep: {default: 0.1}
    },
    
    init: function() {
      this.scale = new THREE.Vector3(1, 1, 1);
      this.initialScale = new THREE.Vector3();
      this.initialDistance = 0;
      this.isScaling = false;
      
      // Get access to hand controllers
      this.leftHand = document.getElementById('left-hand');
      this.rightHand = document.getElementById('right-hand');
      
      // Set up event listeners
      this.startScaling = this.startScaling.bind(this);
      this.endScaling = this.endScaling.bind(this);
      this.onScale = this.onScale.bind(this);
      
      this.el.addEventListener('twohandstart', this.startScaling);
      this.el.addEventListener('twohandend', this.endScaling);
    },
    
    startScaling: function() {
      this.isScaling = true;
      this.initialScale.copy(this.el.object3D.scale);
      
      // Calculate initial distance between hands
      const distance = new THREE.Vector3().subVectors(
        this.leftHand.object3D.position,
        this.rightHand.object3D.position
      ).length();
      
      this.initialDistance = distance;
      
      // Set up scale event
      window.addEventListener('twohandmove', this.onScale);
    },
    
    endScaling: function() {
      this.isScaling = false;
      window.removeEventListener('twohandmove', this.onScale);
    },
    
    onScale: function() {
      if (!this.isScaling) return;
      
      // Calculate current distance between hands
      const distance = new THREE.Vector3().subVectors(
        this.leftHand.object3D.position,
        this.rightHand.object3D.position
      ).length();
      
      // Calculate scale factor
      const scaleFactor = distance / this.initialDistance;
      
      // Apply scale, respecting limits
      this.scale.copy(this.initialScale).multiplyScalar(scaleFactor);
      this.scale.x = THREE.MathUtils.clamp(this.scale.x, this.data.minScale, this.data.maxScale);
      this.scale.y = THREE.MathUtils.clamp(this.scale.y, this.data.minScale, this.data.maxScale);
      
      this.el.object3D.scale.copy(this.scale);
    },
    
    remove: function() {
      this.el.removeEventListener('twohandstart', this.startScaling);
      this.el.removeEventListener('twohandend', this.endScaling);
      window.removeEventListener('twohandmove', this.onScale);
    }
  });
  
  // Hand tracking component for effects
  AFRAME.registerComponent('hand-tracking', {
    schema: {
      hand: {type: 'string', default: 'right'}
    },
    
    init: function() {
      this.position = new THREE.Vector3();
      this.previousPosition = new THREE.Vector3();
      this.velocity = new THREE.Vector3();
      
      // Set up gesture detection
      this.pinchDetected = false;
      this.onPinchStart = this.onPinchStart.bind(this);
      this.onPinchEnd = this.onPinchEnd.bind(this);
      
      this.el.addEventListener('pinchstart', this.onPinchStart);
      this.el.addEventListener('pinchend', this.onPinchEnd);
      
      // Set up hand object
      this.el.setAttribute('visible', true);
    },
    
    tick: function(time, deltaTime) {
      // Update positions for velocity calculation
      this.previousPosition.copy(this.position);
      this.position.copy(this.el.object3D.position);
      
      // Calculate hand velocity
      if (deltaTime > 0) {
        this.velocity.subVectors(this.position, this.previousPosition)
          .multiplyScalar(1000 / deltaTime); // Convert to meters per second
      }
      
      // Emit move event for drag handling
      this.el.emit('move');
      
      // Trigger effects based on velocity if pinching
      if (this.pinchDetected && this.velocity.length() > 1.5) {
        // Emit event for particles or other effects
        this.el.emit('gesture', {
          hand: this.data.hand,
          position: this.position,
          velocity: this.velocity
        });
      }
    },
    
    onPinchStart: function() {
      this.pinchDetected = true;
    },
    
    onPinchEnd: function() {
      this.pinchDetected = false;
    },
    
    remove: function() {
      this.el.removeEventListener('pinchstart', this.onPinchStart);
      this.el.removeEventListener('pinchend', this.onPinchEnd);
    }
  });
  
  // Surface detection for keyboard placement
  AFRAME.registerComponent('surface-detector', {
    init: function() {
      this.surfaces = [];
      this.keyboardPlaced = false;
      
      // Set up event listeners for hit test results
      this.el.sceneEl.addEventListener('hit-test', this.onHitTest.bind(this));
    },
    
    onHitTest: function(event) {
      if (this.keyboardPlaced) return;
      
      const hitResult = event.detail;
      if (hitResult && hitResult.length > 0) {
        // We have a hit on a surface
        const hit = hitResult[0];
        const point = hit.point;
        const normal = hit.normal;
        
        // Check if this is a horizontal surface (table)
        if (Math.abs(normal.y) > 0.8) {
          this.surfaces.push({
            point: point,
            normal: normal,
            timestamp: Date.now()
          });
          
          // If we have enough consistent surface detections, place a keyboard
          if (this.surfaces.length > 5) {
            this.placeKeyboard();
          }
        }
      }
    },
    
    placeKeyboard: function() {
      if (this.keyboardPlaced) return;
      
      // Calculate average position of detected surface
      const avgPosition = new THREE.Vector3();
      this.surfaces.forEach(surface => {
        avgPosition.add(surface.point);
      });
      avgPosition.divideScalar(this.surfaces.length);
      
      // Create keyboard entity
      const keyboard = document.createElement('a-entity');
      keyboard.setAttribute('id', 'virtual-keyboard');
      keyboard.setAttribute('position', avgPosition);
      keyboard.setAttribute('rotation', '-90 0 0'); // Flat on the surface
      
      // Create visual for keyboard
      keyboard.innerHTML = `
        <a-box scale="0.4 0.02 0.15" position="0 0 0" color="#333"></a-box>
        <!-- Add key rows -->
        <a-entity position="-0.15 0.02 0.05">
          <!-- First row of keys -->
          ${this.createKeyRow(10, 0)}
          <!-- Second row of keys -->
          ${this.createKeyRow(9, -0.04)}
          <!-- Third row of keys -->
          ${this.createKeyRow(8, -0.08)}
        </a-entity>
      `;
      
      this.el.sceneEl.appendChild(keyboard);
      this.keyboardPlaced = true;
      
      // Emit event for other components
      this.el.emit('keyboard-placed', {
        position: avgPosition
      });
    },
    
    createKeyRow: function(numKeys, zOffset) {
      let keys = '';
      const keySize = 0.03;
      const keySpacing = 0.035;
      
      for (let i = 0; i < numKeys; i++) {
        keys += `<a-box position="${i * keySpacing} 0 ${zOffset}" 
                       scale="${keySize} 0.01 ${keySize}" 
                       color="#666"></a-box>`;
      }
      
      return keys;
    }
  });
  
  // Screen placement for UI
  AFRAME.registerComponent('screen-position', {
    schema: {
      position: {type: 'string', default: 'center'}
    },
    
    init: function() {
      // Get camera
      this.camera = document.getElementById('camera');
      
      // Position screen based on camera view
      this.positionScreen();
      
      // Update position on window resize
      this.onResize = this.positionScreen.bind(this);
      window.addEventListener('resize', this.onResize);
    },
    
    positionScreen: function() {
      const cameraPosition = this.camera.object3D.position;
      const cameraRotation = this.camera.object3D.rotation;
      const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.object3D.quaternion);
      
      let targetPosition = new THREE.Vector3();
      const distance = 1.5; // Distance from camera
      
      // Position based on schema
      switch (this.data.position) {
        case 'left':
          targetPosition.copy(cameraPosition)
            .add(cameraDirection.clone().multiplyScalar(distance))
            .add(new THREE.Vector3(-0.7, 0, 0));
          break;
        case 'right':
          targetPosition.copy(cameraPosition)
            .add(cameraDirection.clone().multiplyScalar(distance))
            .add(new THREE.Vector3(0.7, 0, 0));
          break;
        case 'center':
        default:
          targetPosition.copy(cameraPosition)
            .add(cameraDirection.clone().multiplyScalar(distance));
          break;
      }
      
      // Set position
      this.el.setAttribute('position', targetPosition);
      
      // Look at camera
      this.el.object3D.lookAt(cameraPosition);
    },
    
    remove: function() {
      window.removeEventListener('resize', this.onResize);
    }
  });
  
  // Button events helper
  AFRAME.registerComponent('button-events', {
    schema: {
      toggleState: {type: 'boolean', default: false},
      event: {type: 'string', default: 'click'},
      targetId: {type: 'string', default: ''}
    },
    
    init: function() {
      this.state = this.data.toggleState;
      
      this.onClick = this.onClick.bind(this);
      this.el.addEventListener(this.data.event, this.onClick);
      
      // Visual feedback
      this.el.addEventListener('mouseenter', () => {
        this.el.setAttribute('material', 'emissive', '#6688cc');
      });
      
      this.el.addEventListener('mouseleave', () => {
        this.el.setAttribute('material', 'emissive', '#111111');
      });
    },
    
    onClick: function() {
      this.state = !this.state;
      
      // Emit event with state
      this.el.emit(this.data.event + '-trigger', {
        state: this.state,
        target: this.data.targetId
      });
      
      // Visual feedback
      if (this.state) {
        this.el.setAttribute('material', 'color', '#4c86f1');
      } else {
        this.el.setAttribute('material', 'color', '#666666');
      }
    },
    
    remove: function() {
      this.el.removeEventListener(this.data.event, this.onClick);
      this.el.removeEventListener('mouseenter', this.onMouseEnter);
      this.el.removeEventListener('mouseleave', this.onMouseLeave);
    }
  });