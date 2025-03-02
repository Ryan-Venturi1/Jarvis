/* JARVIS Iron Man Hand Controller */

// A-Frame component for Iron Man style hand tracking and effects
AFRAME.registerComponent('iron-hand', {
  schema: {
    hand: {type: 'string', default: 'right'},
    effectColor: {type: 'color', default: '#4c86f1'},
    glowIntensity: {type: 'number', default: 0.7},
    enableThrusters: {type: 'boolean', default: true},
    enableGestures: {type: 'boolean', default: true}
  },
  
  init: function() {
    // Store hand position and velocity data
    this.position = new THREE.Vector3();
    this.previousPosition = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    
    // Set up gesture detection
    this.isGripping = false;
    this.isPinching = false;
    this.isPalmOpen = false;
    this.thrusterActive = false;
    this.lastGestureTime = 0;
    this.gestureTimeout = 500; // ms between gesture events
    
    // Create hand effects
    this.setupHandEffects();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Register for animation loop
    this.tick = AFRAME.utils.throttleTick(this.tick, 16, this); // ~60fps
    
    console.log(`Iron Hand initialized for ${this.data.hand} hand`);
  },
  
  setupEventListeners: function() {
    // Controller button events
    this.el.addEventListener('gripdown', this.onGripDown.bind(this));
    this.el.addEventListener('gripup', this.onGripUp.bind(this));
    this.el.addEventListener('triggerdown', this.onTriggerDown.bind(this));
    this.el.addEventListener('triggerup', this.onTriggerUp.bind(this));
    this.el.addEventListener('abuttondown', this.activateThrusters.bind(this));
    this.el.addEventListener('abuttonup', this.deactivateThrusters.bind(this));
    
    // Add thumb stick events for screen controls
    this.el.addEventListener('thumbstickmoved', this.onThumbstickMoved.bind(this));
    
    // Add hand tracking gesture events if WebXR supports it
    if ('XRHand' in window) {
      this.setupHandTrackingEvents();
    }
  },
  
  setupHandTrackingEvents: function() {
    // These would be gesture events from WebXR hand tracking
    this.el.addEventListener('pinchstarted', () => this.isPinching = true);
    this.el.addEventListener('pinchended', () => this.isPinching = false);
    this.el.addEventListener('gripstarted', () => this.isGripping = true);
    this.el.addEventListener('gripended', () => this.isGripping = false);
  },
  
  onGripDown: function() {
    this.isGripping = true;
    this.updatePalmRepulsor(true);
  },
  
  onGripUp: function() {
    this.isGripping = false;
    this.updatePalmRepulsor(false);
  },
  
  onTriggerDown: function() {
    this.isPinching = true;
  },
  
  onTriggerUp: function() {
    this.isPinching = false;
  },
  
  onThumbstickMoved: function(event) {
    // Emit scroll event for interface navigation
    if (Math.abs(event.detail.y) > 0.2) {
      this.el.emit('interface-scroll', {
        hand: this.data.hand,
        value: event.detail.y,
        direction: event.detail.y > 0 ? 'down' : 'up'
      });
    }
    
    // Emit horizontal swipe for tab switching
    if (Math.abs(event.detail.x) > 0.5) {
      this.el.emit('interface-swipe', {
        hand: this.data.hand,
        value: event.detail.x,
        direction: event.detail.x > 0 ? 'right' : 'left'
      });
    }
  },
  
  setupHandEffects: function() {
    // Create container entity for all effects
    const effects = document.createElement('a-entity');
    effects.setAttribute('id', `${this.data.hand}-hand-effects`);
    effects.setAttribute('position', '0 0 0');
    this.el.appendChild(effects);
    this.effectsContainer = effects;
    
    // Create palm repulsor
    this.createPalmRepulsor();
    
    // Create finger thrusters
    if (this.data.enableThrusters) {
      this.createFingerThrusters();
    }
    
    // Create glow effect 
    this.createGlowEffect();
    
    // Create particle system for hand
    this.setupParticleSystem();
    
    // Add HUD interface elements
    this.createHUDElements();
  },
  
  createPalmRepulsor: function() {
    // Create palm repulsor
    const repulsor = document.createElement('a-entity');
    repulsor.setAttribute('id', `${this.data.hand}-palm-repulsor`);
    
    // Position in palm - adjusted for Quest 3 controllers
    const palmPosition = this.data.hand === 'right' ? '0 0.01 0.07' : '0 0.01 0.07';
    repulsor.setAttribute('position', palmPosition);
    
    // Add repulsor geometry
    repulsor.innerHTML = `
      <a-entity
        geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.02"
        material="color: ${this.data.effectColor}; opacity: 0.9; transparent: true; shader: flat; emissive: ${this.data.effectColor}; emissiveIntensity: 0.5"
        animation="property: scale; to: 1.2 1.2 1.2; dur: 1000; dir: alternate; loop: true; easing: easeInOutSine">
      </a-entity>
      <a-entity
        geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
        material="color: white; opacity: 0.9; transparent: true; shader: flat; emissive: white; emissiveIntensity: 0.7"
        animation="property: rotation; to: 0 0 360; dur: 2000; loop: true; easing: linear">
      </a-entity>
      <a-light
        type="point"
        color="${this.data.effectColor}"
        intensity="0.3"
        distance="0.1">
      </a-light>
    `;
    
    this.effectsContainer.appendChild(repulsor);
    this.palmRepulsor = repulsor;
    
    // Initially hide until activated
    this.palmRepulsor.setAttribute('visible', false);
  },
  
  createFingerThrusters: function() {
    // Create finger thrusters
    const thrusterPositions = {
      right: [
        { id: 'thumb', position: '-0.03 0 0.05', rotation: '0 0 -30' },
        { id: 'index', position: '-0.01 0 0.08', rotation: '0 0 -10' },
        { id: 'middle', position: '0.01 0 0.08', rotation: '0 0 0' },
        { id: 'ring', position: '0.03 0 0.07', rotation: '0 0 10' },
        { id: 'pinky', position: '0.045 0 0.06', rotation: '0 0 20' }
      ],
      left: [
        { id: 'thumb', position: '0.03 0 0.05', rotation: '0 0 30' },
        { id: 'index', position: '0.01 0 0.08', rotation: '0 0 10' },
        { id: 'middle', position: '-0.01 0 0.08', rotation: '0 0 0' },
        { id: 'ring', position: '-0.03 0 0.07', rotation: '0 0 -10' },
        { id: 'pinky', position: '-0.045 0 0.06', rotation: '0 0 -20' }
      ]
    };
    
    // Create thruster for each finger
    const handThrusters = document.createElement('a-entity');
    handThrusters.setAttribute('id', `${this.data.hand}-thrusters`);
    
    thrusterPositions[this.data.hand].forEach(thruster => {
      const thrusterEntity = document.createElement('a-entity');
      thrusterEntity.setAttribute('id', `${this.data.hand}-${thruster.id}-thruster`);
      thrusterEntity.setAttribute('position', thruster.position);
      thrusterEntity.setAttribute('rotation', thruster.rotation);
      
      // Add thruster geometry
      thrusterEntity.innerHTML = `
        <a-entity
          geometry="primitive: cone; radiusBottom: 0.005; radiusTop: 0.001; height: 0.01"
          material="color: ${this.data.effectColor}; opacity: 0.9; transparent: true; shader: flat; emissive: ${this.data.effectColor}; emissiveIntensity: 0.3"
          position="0 0 0"
          rotation="180 0 0">
        </a-entity>
        <a-entity
          id="${this.data.hand}-${thruster.id}-flame"
          geometry="primitive: cone; radiusBottom: 0.007; radiusTop: 0.001; height: 0.02"
          material="color: #FFA500; opacity: 0.7; transparent: true; shader: flat; emissive: #FF5722; emissiveIntensity: 0.5"
          position="0 0 -0.01"
          rotation="180 0 0"
          visible="false"
          animation="property: scale; to: 1 1 1.5; dur: 100; dir: alternate; loop: true; easing: easeInOutSine">
        </a-entity>
        <a-light
          id="${this.data.hand}-${thruster.id}-light"
          type="point"
          color="#FFA500"
          intensity="0"
          distance="0.1">
        </a-light>
      `;
      
      handThrusters.appendChild(thrusterEntity);
    });
    
    this.effectsContainer.appendChild(handThrusters);
    this.thrusters = handThrusters;
  },
  
  createGlowEffect: function() {
    // Create overall hand glow
    const glow = document.createElement('a-entity');
    glow.setAttribute('id', `${this.data.hand}-glow`);
    glow.setAttribute('position', '0 0 0');
    
    // Add light for glow
    const glowLight = document.createElement('a-light');
    glowLight.setAttribute('type', 'point');
    glowLight.setAttribute('color', this.data.effectColor);
    glowLight.setAttribute('intensity', this.data.glowIntensity);
    glowLight.setAttribute('distance', '0.2');
    glow.appendChild(glowLight);
    
    // Add subtle glow sphere
    const glowSphere = document.createElement('a-entity');
    glowSphere.setAttribute('geometry', 'primitive: sphere; radius: 0.04');
    glowSphere.setAttribute('material', `color: ${this.data.effectColor}; opacity: 0.3; transparent: true; shader: flat; emissive: ${this.data.effectColor}; emissiveIntensity: 0.2`);
    glowSphere.setAttribute('animation', 'property: scale; to: 1.2 1.2 1.2; dur: 2000; dir: alternate; loop: true; easing: easeInOutSine');
    glow.appendChild(glowSphere);
    
    this.effectsContainer.appendChild(glow);
    this.handGlow = glow;
    this.glowLight = glowLight;
  },
  
  setupParticleSystem: function() {
    // Create particle container
    const particleContainer = document.createElement('a-entity');
    particleContainer.setAttribute('id', `${this.data.hand}-particles`);
    particleContainer.setAttribute('position', '0 0 0');
    
    // Create particle entities
    this.particles = [];
    const particleMaterial = `color: ${this.data.effectColor}; opacity: 0.7; transparent: true; shader: flat; emissive: ${this.data.effectColor}; emissiveIntensity: 0.3`;
    
    // Create pool of particle entities
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('a-entity');
      particle.setAttribute('id', `${this.data.hand}-particle-${i}`);
      particle.setAttribute('geometry', 'primitive: sphere; radius: 0.005');
      particle.setAttribute('material', particleMaterial);
      particle.setAttribute('visible', false);
      
      // Add to container
      particleContainer.appendChild(particle);
      
      // Store in array with metadata
      this.particles.push({
        entity: particle,
        active: false,
        lifetime: 0,
        velocity: new THREE.Vector3(),
        size: 0.005
      });
    }
    
    this.effectsContainer.appendChild(particleContainer);
    this.particleContainer = particleContainer;
  },
  
  createHUDElements: function() {
    // Create HUD elements that follow the hand
    const hud = document.createElement('a-entity');
    hud.setAttribute('id', `${this.data.hand}-hud`);
    
    // Position slightly above the hand
    hud.setAttribute('position', '0 0.08 0');
    
    // Create power indicator
    const powerIndicator = document.createElement('a-entity');
    powerIndicator.setAttribute('id', `${this.data.hand}-power-indicator`);
    powerIndicator.setAttribute('geometry', 'primitive: ring; radiusInner: 0.015; radiusOuter: 0.02;');
    powerIndicator.setAttribute('material', `color: ${this.data.effectColor}; opacity: 0.8; transparent: true; shader: flat`);
    powerIndicator.setAttribute('rotation', '90 0 0'); // Face the user
    powerIndicator.setAttribute('visible', false);
    
    // Add progress bar animation
    powerIndicator.setAttribute('animation__progress', 'property: geometry.thetaLength; from: 0; to: 360; dur: 1000; easing: easeInOutCubic; startEvents: power-charging; pauseEvents: power-pause; resumeEvents: power-resume;');
    
    hud.appendChild(powerIndicator);
    this.powerIndicator = powerIndicator;
    
    // Add text for mode display
    const modeText = document.createElement('a-entity');
    modeText.setAttribute('id', `${this.data.hand}-mode-text`);
    modeText.setAttribute('position', '0 0.02 0');
    modeText.setAttribute('text', `value: JARVIS; align: center; width: 0.1; color: ${this.data.effectColor}; shader: msdf;`);
    modeText.setAttribute('rotation', '90 0 0');
    modeText.setAttribute('visible', false);
    
    hud.appendChild(modeText);
    this.modeText = modeText;
    
    this.effectsContainer.appendChild(hud);
    this.hud = hud;
  },
  
  tick: function(time, deltaTime) {
    if (!deltaTime) return;
    
    // Update position and velocity
    this.previousPosition.copy(this.position);
    this.position.copy(this.el.object3D.position);
    
    // Update quaternion
    this.quaternion.copy(this.el.object3D.quaternion);
    
    const dt = deltaTime / 1000; // Convert to seconds
    if (dt > 0) {
      this.velocity.subVectors(this.position, this.previousPosition).divideScalar(dt);
    }
    
    // Update hand effects
    this.updateParticles(dt);
    this.updatePalmRepulsor();
    
    if (this.data.enableThrusters) {
      this.updateThrusters();
    }
    
    this.updateGlowEffect();
    
    // Detect and emit gestures
    if (this.data.enableGestures) {
      this.detectGestures(time);
    }
    
    // Update HUD elements
    this.updateHUD(time);
  },
  
  updateParticles: function(dt) {
    // Update existing particles
    this.particles.forEach(particle => {
      if (particle.active) {
        // Update lifetime
        particle.lifetime -= dt;
        
        if (particle.lifetime <= 0) {
          // Deactivate expired particles
          particle.active = false;
          particle.entity.setAttribute('visible', false);
        } else {
          // Move particle based on velocity
          const position = particle.entity.getAttribute('position');
          const newPosition = {
            x: position.x + particle.velocity.x * dt,
            y: position.y + particle.velocity.y * dt,
            z: position.z + particle.velocity.z * dt
          };
          particle.entity.setAttribute('position', newPosition);
          
          // Fade out particle
          const opacity = (particle.lifetime / particle.maxLifetime) * 0.7;
          particle.entity.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${opacity}; transparent: true; shader: flat; emissive: ${this.data.effectColor}; emissiveIntensity: ${opacity * 0.5}`);
          
          // Scale down over time
          const scale = (particle.lifetime / particle.maxLifetime) * particle.size;
          particle.entity.setAttribute('scale', `${scale} ${scale} ${scale}`);
        }
      }
    });
    
    // Emit new particles based on activity
    if ((this.isGripping || this.isPinching) && this.velocity.length() > 0.5) {
      const count = Math.min(Math.floor(this.velocity.length() * 3), 5);
      for (let i = 0; i < count; i++) {
        this.emitParticle();
      }
    }
    
    // Add thruster particles if active
    if (this.thrusterActive) {
      for (let i = 0; i < 2; i++) {
        this.emitThrusterParticle();
      }
    }
  },
  
  emitParticle: function() {
    // Find an inactive particle
    const particle = this.particles.find(p => !p.active);
    if (!particle) return;
    
    // Activate particle
    particle.active = true;
    particle.entity.setAttribute('visible', true);
    
    // Set position at hand with random offset
    const offset = {
      x: (Math.random() - 0.5) * 0.1,
      y: (Math.random() - 0.5) * 0.1,
      z: (Math.random() - 0.5) * 0.1
    };
    
    particle.entity.setAttribute('position', {
      x: this.position.x + offset.x,
      y: this.position.y + offset.y,
      z: this.position.z + offset.z
    });
    
    // Set velocity based on hand velocity plus random component
    const speed = this.velocity.length();
    const direction = this.velocity.clone().normalize();
    
    particle.velocity.copy(direction).multiplyScalar(speed * 0.2);
    
    // Add random velocity
    particle.velocity.x += (Math.random() - 0.5) * 0.5;
    particle.velocity.y += (Math.random() - 0.5) * 0.5;
    particle.velocity.z += (Math.random() - 0.5) * 0.5;
    
    // Set lifetime and appearance
    particle.lifetime = 0.5 + Math.random() * 0.5;
    particle.maxLifetime = particle.lifetime;
    particle.size = 0.005 + (Math.random() * 0.005);
    
    // Set initial scale and opacity
    particle.entity.setAttribute('scale', `${particle.size} ${particle.size} ${particle.size}`);
    particle.entity.setAttribute('material', `color: ${this.data.effectColor}; opacity: 0.7; transparent: true; shader: flat`);
  },
  
  emitThrusterParticle: function() {
    // Similar to emitParticle but for thrusters
    const particle = this.particles.find(p => !p.active);
    if (!particle) return;
    
    // Activate particle
    particle.active = true;
    particle.entity.setAttribute('visible', true);
    
    // Set position based on fingers
    const fingerIds = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    const randomFinger = fingerIds[Math.floor(Math.random() * fingerIds.length)];
    const thruster = document.getElementById(`${this.data.hand}-${randomFinger}-thruster`);
    
    if (!thruster) return;
    
    // Get thruster world position
    const worldPos = new THREE.Vector3();
    thruster.object3D.getWorldPosition(worldPos);
    
    // Set position with slight randomness
    particle.entity.setAttribute('position', {
      x: worldPos.x + (Math.random() - 0.5) * 0.02,
      y: worldPos.y + (Math.random() - 0.5) * 0.02,
      z: worldPos.z + (Math.random() - 0.5) * 0.02
    });
    
    // Set downward velocity for thruster effect
    particle.velocity.set(
      (Math.random() - 0.5) * 0.2,
      -0.5 - Math.random() * 0.5,
      (Math.random() - 0.5) * 0.2
    );
    
    // Set lifetime and appearance - use orange color for thruster
    particle.lifetime = 0.3 + Math.random() * 0.3;
    particle.maxLifetime = particle.lifetime;
    particle.size = 0.004 + (Math.random() * 0.004);
    
    // Set initial scale and make orange for thruster
    particle.entity.setAttribute('scale', `${particle.size} ${particle.size} ${particle.size}`);
    particle.entity.setAttribute('material', 'color: #FFA500; opacity: 0.7; transparent: true; shader: flat; emissive: #FF5722; emissiveIntensity: 0.5');
  },
  
  updatePalmRepulsor: function(forcedState) {
    if (!this.palmRepulsor) return;
    
    // Show repulsor when gripping or when forcedState is provided
    const show = (forcedState !== undefined) ? forcedState : this.isGripping;
    
    if (show !== (this.palmRepulsor.getAttribute('visible') === 'true')) {
      this.palmRepulsor.setAttribute('visible', show);
    }
    
    // Increase repulsor intensity based on velocity when pushing
    if (show) {
      const speed = this.velocity.length();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
      const pushAmount = Math.max(0, forward.dot(this.velocity.clone().normalize()));
      
      // Only increase when pushing forward
      if (pushAmount > 0.5 && speed > 0.5) {
        const intensity = 0.3 + Math.min(speed * pushAmount * 0.5, 1.0);
        this.palmRepulsor.querySelector('a-light').setAttribute('intensity', intensity);
        
        // Scale repulsor size with intensity
        const scale = 1 + Math.min(intensity * 0.5, 0.5);
        this.palmRepulsor.setAttribute('scale', `${scale} ${scale} ${scale}`);
      } else {
        this.palmRepulsor.querySelector('a-light').setAttribute('intensity', 0.3);
        this.palmRepulsor.setAttribute('scale', '1 1 1');
      }
    }
  },
  
  updateThrusters: function() {
    if (!this.thrusters) return;
    
    // Get all thruster flames
    const flames = this.thrusters.querySelectorAll('[id$="-flame"]');
    const lights = this.thrusters.querySelectorAll('[id$="-light"]');
    
    // Set visibility based on thruster state
    flames.forEach(flame => {
      flame.setAttribute('visible', this.thrusterActive);
    });
    
    // Set light intensity based on thruster state
    lights.forEach(light => {
      light.setAttribute('intensity', this.thrusterActive ? 0.5 : 0);
    });
    
    // If thrusters are active, update controller velocity for movement
    if (this.thrusterActive) {
      // Calculate upward force based on hand orientation
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quaternion);
      
      // Emit event for physics movement
      this.el.emit('thruster-force', {
        hand: this.data.hand,
        direction: up,
        force: 5.0  // Force magnitude
      });
    }
  },
  
  updateGlowEffect: function() {
    if (!this.handGlow || !this.glowLight) return;
    
    // Calculate base glow intensity with subtle pulsing
    let intensity = this.data.glowIntensity * (0.7 + 0.3 * Math.sin(Date.now() / 500));
    
    // Increase intensity when active
    if (this.isGripping || this.isPinching) {
      const speedFactor = Math.min(this.velocity.length() * 0.3, 0.5);
      intensity += speedFactor;
    }
    
    // Increase further when thruster active
    if (this.thrusterActive) {
      intensity += 0.3;
    }
    
    // Update light intensity
    this.glowLight.setAttribute('intensity', intensity);
  },
  
  updateHUD: function(time) {
    if (!this.hud) return;
    
    // Show HUD elements when hand is active (and user is actively looking at it)
    const isActive = this.isGripping || this.isPinching || this.thrusterActive;
    
    if (isActive) {
      // Only show HUD when looking at the hand
      const camera = document.querySelector('#camera').object3D;
      const cameraPos = new THREE.Vector3();
      camera.getWorldPosition(cameraPos);
      
      const handPos = new THREE.Vector3();
      this.el.object3D.getWorldPosition(handPos);
      
      const toHand = new THREE.Vector3().subVectors(handPos, cameraPos).normalize();
      const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      
      // If looking at hand (dot product > 0.7)
      if (toHand.dot(cameraDirection) > 0.7) {
        this.powerIndicator.setAttribute('visible', true);
        this.modeText.setAttribute('visible', true);
        
        // Update power indicator progress based on grip strength
        if (this.isGripping) {
          const progress = (Math.sin(time / 500) + 1) * 180; // Oscillate between 0-360
          this.powerIndicator.setAttribute('geometry', `primitive: ring; radiusInner: 0.015; radiusOuter: 0.02; thetaLength: ${progress}`);
        }
      } else {
        this.powerIndicator.setAttribute('visible', false);
        this.modeText.setAttribute('visible', false);
      }
    } else {
      this.powerIndicator.setAttribute('visible', false);
      this.modeText.setAttribute('visible', false);
    }
  },
  
  detectGestures: function(time) {
    // Only detect gestures at a reasonable interval
    if (time - this.lastGestureTime < this.gestureTimeout) return;
    
    const speed = this.velocity.length();
    
    // Detect push gesture (high forward velocity while gripping)
    if (this.isGripping && speed > 1.0) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
      const dot = forward.dot(this.velocity.clone().normalize());
      
      if (dot > 0.7) { // Forward direction
        this.el.emit('iron-hand-gesture', {
          hand: this.data.hand,
          type: 'push',
          velocity: this.velocity.clone(),
          position: this.position.clone()
        });
        
        // Trigger push effect animation
        this.animatePushEffect();
        this.lastGestureTime = time;
      }
    }
    
    // Detect swipe gesture (high lateral velocity while pinching)
    if (this.isPinching && speed > 0.8) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
      const dot = Math.abs(right.dot(this.velocity.clone().normalize()));
      
      if (dot > 0.7) { // Side direction
        const direction = right.dot(this.velocity.clone().normalize()) > 0 ? 'right' : 'left';
        
        this.el.emit('iron-hand-gesture', {
          hand: this.data.hand,
          type: 'swipe',
          direction: direction,
          velocity: this.velocity.clone(),
          position: this.position.clone()
        });
        
        // Trigger swipe effect animation
        this.animateSwipeEffect(direction);
        this.lastGestureTime = time;
      }
    }
    
    // Detect snap gesture (quick pinch and release)
    if (this.isPinching && !this.wasPinching) {
      this.pinchStartTime = time;
    } else if (!this.isPinching && this.wasPinching) {
      if (time - this.pinchStartTime < 300) { // Quick pinch and release
        this.el.emit('iron-hand-gesture', {
          hand: this.data.hand,
          type: 'snap',
          position: this.position.clone()
        });
        
        // Trigger snap effect
        this.animateSnapEffect();
        this.lastGestureTime = time;
      }
    }
    
    this.wasPinching = this.isPinching;
  },
  
  animatePushEffect: function() {
    // Create Iron Man style repulsor blast effect
    const position = this.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
    
    // Create effect at palm position
    const palmPosition = this.palmRepulsor.getAttribute('position');
    const worldPalmPos = new THREE.Vector3(
      position.x + parseFloat(palmPosition.x),
      position.y + parseFloat(palmPosition.y),
      position.z + parseFloat(palmPosition.z)
    );
    
    // Create blast entity
    const blast = document.createElement('a-entity');
    blast.setAttribute('id', `${this.data.hand}-blast-${Date.now()}`);
    blast.setAttribute('geometry', 'primitive: ring; radiusInner: 0.05; radiusOuter: 0.1');
    blast.setAttribute('material', `color: ${this.data.effectColor}; opacity: 0.9; transparent: true; shader: flat; side: double; emissive: ${this.data.effectColor}; emissiveIntensity: 0.7`);
    blast.setAttribute('position', worldPalmPos);
    
    // Create lookAt object
    const lookAtPosition = new THREE.Vector3().copy(worldPalmPos).add(forward);
    blast.setAttribute('look-at', lookAtPosition);
    
    // Add light
    const light = document.createElement('a-light');
    light.setAttribute('type', 'point');
    light.setAttribute('color', this.data.effectColor);
    light.setAttribute('intensity', '1.0');
    light.setAttribute('distance', '5');
    blast.appendChild(light);
    
    // Add to scene
    this.el.sceneEl.appendChild(blast);
    
    // Animate outward
    let scale = 0.2;
    let distance = 0;
    let opacity = 0.9;
    
    const animate = () => {
      // Increase scale
      scale += 0.2;
      blast.setAttribute('scale', `${scale} ${scale} ${scale}`);
      
      // Move forward
      distance += 0.2;
      const newPos = worldPalmPos.clone().add(forward.clone().multiplyScalar(distance));
      blast.setAttribute('position', newPos);
      
      // Fade out
      opacity -= 0.05;
      if (opacity > 0) {
        blast.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${opacity}; transparent: true; shader: flat; side: double; emissive: ${this.data.effectColor}; emissiveIntensity: ${opacity * 0.7}`);
        light.setAttribute('intensity', opacity);
        
        // Continue animation
        if (distance < 5) {
          requestAnimationFrame(animate);
        } else {
          // Remove when far enough
          setTimeout(() => {
            if (blast.parentNode) {
              blast.parentNode.removeChild(blast);
            }
          }, 300);
        }
      } else {
        // Remove when faded out
        if (blast.parentNode) {
          blast.parentNode.removeChild(blast);
        }
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  animateSwipeEffect: function(direction) {
    // Create swipe trail effect
    const position = this.position.clone();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quaternion);
    
    // If left swipe, invert direction
    if (direction === 'left') {
      right.multiplyScalar(-1);
    }
    
    // Create trail entities
    const segments = 5;
    const trail = document.createElement('a-entity');
    trail.setAttribute('id', `swipe-trail-${Date.now()}`);
    
    // Add trail segments
    for (let i = 0; i < segments; i++) {
      const segment = document.createElement('a-entity');
      
      // Position along swipe direction
      const segmentPos = position.clone().add(right.clone().multiplyScalar(i * 0.1));
      segment.setAttribute('position', segmentPos);
      
      // Create glowing rectangle
      segment.setAttribute('geometry', 'primitive: plane; width: 0.1; height: 0.05');
      segment.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${0.8 - (i * 0.15)}; transparent: true; shader: flat; side: double; emissive: ${this.data.effectColor}; emissiveIntensity: ${0.5 - (i * 0.1)}`);
      
      // Orient along swipe direction
      const camera = document.querySelector('#camera').object3D;
      segment.setAttribute('look-at', camera.position);
      
      trail.appendChild(segment);
    }
    
    // Add to scene
    this.el.sceneEl.appendChild(trail);
    
    // Animate trail fade out
    let opacity = 0.8;
    
    const animate = () => {
      opacity -= 0.05;
      
      if (opacity > 0) {
        // Update each segment
        for (let i = 0; i < segments; i++) {
          const segment = trail.children[i];
          segment.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${opacity - (i * 0.15)}; transparent: true; shader: flat; side: double; emissive: ${this.data.effectColor}; emissiveIntensity: ${(opacity - (i * 0.1)) * 0.5}`);
        }
        
        requestAnimationFrame(animate);
      } else {
        // Remove when faded out
        if (trail.parentNode) {
          trail.parentNode.removeChild(trail);
        }
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  animateSnapEffect: function() {
    // Create a snap flash effect
    const position = this.position.clone();
    
    // Create flash entity
    const flash = document.createElement('a-entity');
    flash.setAttribute('id', `snap-flash-${Date.now()}`);
    flash.setAttribute('geometry', 'primitive: sphere; radius: 0.1');
    flash.setAttribute('material', `color: white; opacity: 0.8; transparent: true; shader: flat; emissive: white; emissiveIntensity: 1.0`);
    flash.setAttribute('position', position);
    
    // Add light
    const light = document.createElement('a-light');
    light.setAttribute('type', 'point');
    light.setAttribute('color', 'white');
    light.setAttribute('intensity', '2.0');
    light.setAttribute('distance', '3');
    flash.appendChild(light);
    
    // Add to scene
    this.el.sceneEl.appendChild(flash);
    
    // Animate flash
    let scale = 1.0;
    let opacity = 0.8;
    
    const animate = () => {
      // Increase scale
      scale += 0.2;
      flash.setAttribute('scale', `${scale} ${scale} ${scale}`);
      
      // Fade out
      opacity -= 0.1;
      
      if (opacity > 0) {
        flash.setAttribute('material', `color: white; opacity: ${opacity}; transparent: true; shader: flat; emissive: white; emissiveIntensity: ${opacity}`);
        light.setAttribute('intensity', opacity * 2);
        
        requestAnimationFrame(animate);
      } else {
        // Remove when faded out
        if (flash.parentNode) {
          flash.parentNode.removeChild(flash);
        }
      }
    };
    
    requestAnimationFrame(animate);
  },
  
  activateThrusters: function() {
    this.thrusterActive = true;
    
    // Show thruster effects
    if (this.thrusters) {
      this.thrusters.setAttribute('visible', true);
    }
    
    // Notify for physics movement
    this.el.emit('iron-hand-thruster', {
      hand: this.data.hand,
      active: true
    });
    
    // Show visual feedback on HUD
    if (this.modeText) {
      this.modeText.setAttribute('text', `value: FLIGHT MODE; align: center; width: 0.1; color: #FFA500;`);
      this.modeText.setAttribute('visible', true);
    }
  },
  
  deactivateThrusters: function() {
    this.thrusterActive = false;
    
    // Notify for physics movement
    this.el.emit('iron-hand-thruster', {
      hand: this.data.hand,
      active: false
    });
    
    // Reset HUD text
    if (this.modeText) {
      this.modeText.setAttribute('text', `value: JARVIS; align: center; width: 0.1; color: ${this.data.effectColor};`);
    }
  }
});

// Register hand-controller component that will add iron-hand to both hands
AFRAME.registerComponent('hand-controller', {
  schema: {
    hand: {type: 'string', default: 'right'},
    effectColor: {type: 'color', default: '#4c86f1'}
  },
  
  init: function() {
    // Add iron-hand component
    this.el.setAttribute('iron-hand', {
      hand: this.data.hand,
      effectColor: this.data.hand === 'right' ? '#4c86f1' : '#15ACCF'
    });
    
    // Add raycaster for interaction
    this.el.setAttribute('raycaster', {
      objects: '.virtual-screen, .keyboard-key, .vr-button',
      far: 3,
      showLine: true,
      lineColor: this.data.hand === 'right' ? '#4c86f1' : '#15ACCF'
    });
    
    // Add event listeners for interface interactions
    this.el.addEventListener('iron-hand-gesture', this.handleGesture.bind(this));
  },
  
  handleGesture: function(event) {
    const detail = event.detail;
    
    // Dispatch appropriate events based on gesture type
    switch (detail.type) {
      case 'push':
        // Push interaction - activate or click
        this.el.emit('interface-activate', {
          hand: this.data.hand,
          position: detail.position,
          velocity: detail.velocity
        });
        break;
        
      case 'swipe':
        // Swipe interaction - change tabs or screens
        this.el.emit('interface-swipe', {
          hand: this.data.hand,
          direction: detail.direction
        });
        break;
        
      case 'snap':
        // Snap interaction - toggle system or switch mode
        this.el.emit('system-toggle', {
          hand: this.data.hand
        });
        break;
    }
  }
});