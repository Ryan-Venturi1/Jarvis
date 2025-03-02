/* JARVIS Hand Controller and Effects */

// A-Frame component for hand tracking and effects
AFRAME.registerComponent('hand-controller', {
    schema: {
      hand: {type: 'string', default: 'right'},
      effectColor: {type: 'color', default: '#4c86f1'}
    },
    
    init: function() {
      this.position = new THREE.Vector3();
      this.previousPosition = new THREE.Vector3();
      this.velocity = new THREE.Vector3();
      
      // Set up particle system for hand effects
      this.setupParticleSystem();
      
      // Set up gesture detection
      this.setupGestureDetection();
      
      // Set up event listeners
      this.el.addEventListener('gesture', this.onGesture.bind(this));
      document.addEventListener('keydown', this.onKeyDown.bind(this));
    },
    
    setupParticleSystem: function() {
      // Create particle system for hand effects
      // We'll use the Three.js GPUParticleSystem for better performance
      // Check if we have access to THREE
      if (typeof THREE === 'undefined' || !THREE.GPUParticleSystem) {
        console.warn('THREE.GPUParticleSystem not available, using basic particles');
        this.particleSystem = null;
        return;
      }
      
      // Create container for particles
      this.particleContainer = new THREE.Object3D();
      this.el.object3D.add(this.particleContainer);
      
      // Create particle options
      this.particleOptions = {
        position: new THREE.Vector3(),
        positionRandomness: 0.3,
        velocity: new THREE.Vector3(),
        velocityRandomness: 0.5,
        color: new THREE.Color(this.data.effectColor),
        colorRandomness: 0.2,
        turbulence: 0.5,
        lifetime: 2,
        size: 5,
        sizeRandomness: 1
      };
      
      this.spawnerOptions = {
        spawnRate: 15000,
        horizontalSpeed: 1.5,
        verticalSpeed: 1.5,
        timeScale: 1
      };
      
      this.particleSystem = new THREE.GPUParticleSystem({
        maxParticles: 250000
      });
      
      this.particleContainer.add(this.particleSystem);
      this.clock = new THREE.Clock();
    },
    
    setupGestureDetection: function() {
      // We'll rely on WebXR hand tracking API if available
      // For now, we'll simulate gestures with controller buttons
      
      this.isGripping = false;
      this.isPinching = false;
      
      // Listen for controller events
      this.el.addEventListener('gripdown', () => {
        this.isGripping = true;
      });
      
      this.el.addEventListener('gripup', () => {
        this.isGripping = false;
      });
      
      this.el.addEventListener('triggerdown', () => {
        this.isPinching = true;
      });
      
      this.el.addEventListener('triggerup', () => {
        this.isPinching = false;
      });
    },
    
    tick: function(time, deltaTime) {
      // Skip if no meaningful time passed
      if (!deltaTime) return;
      
      // Update positions for velocity calculation
      this.previousPosition.copy(this.position);
      this.position.copy(this.el.object3D.position);
      
      // Calculate hand velocity
      const dt = deltaTime / 1000; // Convert to seconds
      if (dt > 0) {
        this.velocity.subVectors(this.position, this.previousPosition).divideScalar(dt);
      }
      
      // Update particle system
      this.updateParticles(deltaTime);
      
      // Emit gesture events based on controller state and velocity
      this.detectGestures();
    },
    
    updateParticles: function(deltaTime) {
      if (!this.particleSystem) return;
      
      // Update particle system
      const delta = this.clock.getDelta() * this.spawnerOptions.timeScale;
      
      // Only emit particles when making gestures
      if (this.isGripping || this.isPinching) {
        // Update emitter position to hand position
        this.particleOptions.position.copy(this.position);
        
        // Set velocity based on hand movement
        const speed = this.velocity.length();
        if (speed > 0.5) { // Only emit when moving reasonably fast
          // Direction for particles to emit
          const direction = this.velocity.clone().normalize();
          
          // Update particle velocity
          this.particleOptions.velocity.copy(direction).multiplyScalar(Math.min(speed, 2));
          
          // Spawn particles
          for (let i = 0; i < delta * this.spawnerOptions.spawnRate; i++) {
            this.particleSystem.spawnParticle(this.particleOptions);
          }
        }
      }
      
      // Update particle system
      this.particleSystem.update(delta);
    },
    
    detectGestures: function() {
      // Detect gestures based on controller state and velocity
      const speed = this.velocity.length();
      
      // Detect push gesture (high forward velocity while gripping)
      if (this.isGripping && speed > 1.5) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
        const dot = forward.dot(this.velocity.clone().normalize());
        
        if (dot > 0.7) { // Forward direction
          this.el.emit('gesture', {
            hand: this.data.hand,
            type: 'push',
            velocity: this.velocity.clone(),
            position: this.position.clone()
          });
        }
      }
      
      // Detect swipe gesture (high lateral velocity while pinching)
      if (this.isPinching && speed > 1.0) {
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.el.object3D.quaternion);
        const dot = Math.abs(right.dot(this.velocity.clone().normalize()));
        
        if (dot > 0.7) { // Side direction
          const direction = right.dot(this.velocity.clone().normalize()) > 0 ? 'right' : 'left';
          
          this.el.emit('gesture', {
            hand: this.data.hand,
            type: 'swipe',
            direction: direction,
            velocity: this.velocity.clone(),
            position: this.position.clone()
          });
        }
      }
    },
    
    onGesture: function(event) {
      const detail = event.detail;
      
      // Handle different gestures
      switch (detail.type) {
        case 'push':
          this.createPushEffect(detail);
          break;
        case 'swipe':
          this.createSwipeEffect(detail);
          break;
        default:
          // Generic effect
          this.createGenericEffect(detail);
      }
    },
    
    createPushEffect: function(detail) {
      // Create a push effect (energy blast)
      this.playPalmBlastEffect(detail.position, detail.velocity);
    },
    
    createSwipeEffect: function(detail) {
      // Create a swipe effect (trail)
      this.playSwipeEffect(detail.position, detail.velocity, detail.direction);
    },
    
    createGenericEffect: function(detail) {
      // Create a generic effect (particles)
      // Already handled by updateParticles
    },
    
    playPalmBlastEffect: function(position, velocity) {
      // Create energy blast from palm
      // This is a simple implementation - in a real app, you might use more advanced effects
      
      // Create a sphere to represent the blast
      const blast = document.createElement('a-entity');
      blast.setAttribute('geometry', 'primitive: sphere; radius: 0.05');
      blast.setAttribute('material', `color: ${this.data.effectColor}; opacity: 0.7; shader: flat`);
      blast.setAttribute('position', position.toArray().join(' '));
      
      // Add light for glow effect
      blast.innerHTML = `<a-light color="${this.data.effectColor}" intensity="2" distance="0.5"></a-light>`;
      
      // Add to scene
      this.el.sceneEl.appendChild(blast);
      
      // Animate blast
      let scale = 0.05;
      let distance = 0;
      const direction = velocity.clone().normalize();
      
      const animate = () => {
        // Increase size
        scale += 0.01;
        blast.setAttribute('scale', `${scale} ${scale} ${scale}`);
        
        // Move in direction of velocity
        distance += 0.05;
        const newPos = position.clone().add(direction.clone().multiplyScalar(distance));
        blast.setAttribute('position', newPos.toArray().join(' '));
        
        // Continue animation or end
        if (distance < 3) {
          requestAnimationFrame(animate);
        } else {
          // Fade out and remove
          let opacity = 0.7;
          const fadeOut = () => {
            opacity -= 0.05;
            if (opacity > 0) {
              blast.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${opacity}; shader: flat`);
              requestAnimationFrame(fadeOut);
            } else {
              if (blast.parentNode) {
                blast.parentNode.removeChild(blast);
              }
            }
          };
          fadeOut();
        }
      };
      
      animate();
    },
    
    playSwipeEffect: function(position, velocity, direction) {
      // Create swipe trail effect
      // Create a trail of particles
      if (!this.particleSystem) return;
      
      // Increase spawn rate temporarily
      const originalRate = this.spawnerOptions.spawnRate;
      this.spawnerOptions.spawnRate = 50000;
      
      // Create directional trail
      const dir = direction === 'right' ? 1 : -1;
      const right = new THREE.Vector3(dir, 0, 0).applyQuaternion(this.el.object3D.quaternion);
      
      // Update particle options
      this.particleOptions.velocity.copy(right).multiplyScalar(2);
      this.particleOptions.lifetime = 1;
      
      // Create swipe trail
      setTimeout(() => {
        this.spawnerOptions.spawnRate = originalRate;
      }, 300);
    },
    
    onKeyDown: function(e) {
      // Debug: trigger gestures with keyboard for testing
      if (!this.data.hand === 'right') return;
      
      if (e.code === 'KeyF') {
        // Simulate push gesture
        this.el.emit('gesture', {
          hand: this.data.hand,
          type: 'push',
          velocity: new THREE.Vector3(0, 0, -2),
          position: this.position.clone()
        });
      }
      else if (e.code === 'KeyG') {
        // Simulate swipe gesture
        this.el.emit('gesture', {
          hand: this.data.hand,
          type: 'swipe',
          direction: 'right',
          velocity: new THREE.Vector3(2, 0, 0),
          position: this.position.clone()
        });
      }
    }
  });
  
  // Initialize hand controllers
  document.addEventListener('DOMContentLoaded', () => {
    // Find hand entities
    const leftHand = document.getElementById('left-hand');
    const rightHand = document.getElementById('right-hand');
    
    // Add hand-controller component
    if (leftHand && !leftHand.hasAttribute('hand-controller')) {
      leftHand.setAttribute('hand-controller', {hand: 'left'});
    }
    if (rightHand && !rightHand.hasAttribute('hand-controller')) {
        rightHand.setAttribute('hand-controller', {hand: 'right'});
    }    
  });