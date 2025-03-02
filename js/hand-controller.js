/* JARVIS Iron Man Hand Controller */

// A-Frame component for Iron Man style hand tracking and effects
AFRAME.registerComponent('iron-hand', {
  schema: {
    hand: {type: 'string', default: 'right'},
    effectColor: {type: 'color', default: '#4c86f1'},
    glowIntensity: {type: 'number', default: 0.7},
    enableThrusters: {type: 'boolean', default: true}
  },
  
  init: function() {
    // Store hand position and velocity data
    this.position = new THREE.Vector3();
    this.previousPosition = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    
    // Set up gesture detection
    this.isGripping = false;
    this.isPinching = false;
    this.isPalmOpen = false;
    this.thrusterActive = false;
    
    // Create hand effects
    this.setupHandEffects();
    
    // Set up event listeners
    this.el.addEventListener('gripdown', () => this.isGripping = true);
    this.el.addEventListener('gripup', () => this.isGripping = false);
    this.el.addEventListener('triggerdown', () => this.isPinching = true);
    this.el.addEventListener('triggerup', () => this.isPinching = false);
    this.el.addEventListener('abuttondown', this.activateThrusters.bind(this));
    this.el.addEventListener('abuttonup', this.deactivateThrusters.bind(this));
    
    // Register for animation loop
    this.tick = AFRAME.utils.throttleTick(this.tick, 16, this); // ~60fps
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
  },
  
  createPalmRepulsor: function() {
    // Create palm repulsor
    const repulsor = document.createElement('a-entity');
    repulsor.setAttribute('id', `${this.data.hand}-palm-repulsor`);
    
    // Position in palm
    const palmPosition = this.data.hand === 'right' ? '0 0.02 0.07' : '0 0.02 0.07';
    repulsor.setAttribute('position', palmPosition);
    
    // Add repulsor geometry
    repulsor.innerHTML = `
      <a-entity
        geometry="primitive: ring; radiusInner: 0.01; radiusOuter: 0.02"
        material="color: ${this.data.effectColor}; opacity: 0.9; transparent: true; shader: flat"
        animation="property: scale; to: 1.2 1.2 1.2; dur: 1000; dir: alternate; loop: true; easing: easeInOutSine">
      </a-entity>
      <a-entity
        geometry="primitive: ring; radiusInner: 0.005; radiusOuter: 0.01"
        material="color: white; opacity: 0.9; transparent: true; shader: flat"
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
          material="color: ${this.data.effectColor}; opacity: 0.9; transparent: true; shader: flat"
          position="0 0 0"
          rotation="180 0 0">
        </a-entity>
        <a-entity
          id="${this.data.hand}-${thruster.id}-flame"
          geometry="primitive: cone; radiusBottom: 0.007; radiusTop: 0.001; height: 0.02"
          material="color: #FFA500; opacity: 0.7; transparent: true; shader: flat"
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
    glowSphere.setAttribute('material', `color: ${this.data.effectColor}; opacity: 0.3; transparent: true; shader: flat`);
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
    const particleMaterial = `color: ${this.data.effectColor}; opacity: 0.7; transparent: true; shader: flat`;
    
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
  
  tick: function(time, deltaTime) {
    if (!deltaTime) return;
    
    // Update position and velocity
    this.previousPosition.copy(this.position);
    this.position.copy(this.el.object3D.position);
    
    const dt = deltaTime / 1000; // Convert to seconds
    if (dt > 0) {
      this.velocity.subVectors(this.position, this.previousPosition).divideScalar(dt);
    }
    
    // Update particles
    this.updateParticles(dt);
    
    // Update palm repulsor
    this.updatePalmRepulsor();
    
    // Update thrusters
    if (this.data.enableThrusters) {
      this.updateThrusters();
    }
    
    // Update glow effect based on activity
    this.updateGlowEffect();
    
    // Detect and emit gestures
    this.detectGestures();
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
          particle.entity.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${opacity}; transparent: true; shader: flat`);
          
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
    particle.entity.setAttribute('material', 'color: #FFA500; opacity: 0.7; transparent: true; shader: flat');
  },
  
  updatePalmRepulsor: function() {
    if (!this.palmRepulsor) return;
    
    // Show repulsor when gripping
    const show = this.isGripping;
    if (show !== this.palmRepulsor.getAttribute('visible')) {
      this.palmRepulsor.setAttribute('visible', show);
    }
    
    // Increase repulsor intensity based on velocity when pushing
    if (show) {
      const speed = this.velocity.length();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
      const pushAmount = Math.max(0, forward.dot(this.velocity.clone().normalize()));
      
      // Only increase when pushing forward
      if (pushAmount > 0.5 && speed > 0.5) {
        const intensity = 0.3 + Math.min(speed * pushAmount * 0.5, 1.0);
        this.palmRepulsor.querySelector('a-light').setAttribute('intensity', intensity);
      } else {
        this.palmRepulsor.querySelector('a-light').setAttribute('intensity', 0.3);
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
  },
  
  updateGlowEffect: function() {
    if (!this.handGlow || !this.glowLight) return;
    
    // Calculate base glow intensity
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
  
  detectGestures: function() {
    const speed = this.velocity.length();
    
    // Detect push gesture (high forward velocity while gripping)
    if (this.isGripping && speed > 1.0) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
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
      }
    }
    
    // Detect swipe gesture (high lateral velocity while pinching)
    if (this.isPinching && speed > 0.8) {
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.el.object3D.quaternion);
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
      }
    }
  },
  
  animatePushEffect: function() {
    // Create Iron Man style repulsor blast effect
    const position = this.position.clone();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.el.object3D.quaternion);
    
    // Create effect at palm position
    const palmPosition = this.palmRepulsor.getAttribute('position');
    const worldPalmPos = new THREE.Vector3(
      position.x + parseFloat(palmPosition.x),
      position.y + parseFloat(palmPosition.y),
      position.z + parseFloat(palmPosition.z)
    );
    
    // Create blast entity
    const blast = document.createElement('a-entity');
    blast.setAttribute('geometry', 'primitive: ring; radiusInner: 0.05; radiusOuter: 0.1');
    blast.setAttribute('material', `color: ${this.data.effectColor}; opacity: 0.9; transparent: true; shader: flat; side: double`);
    blast.setAttribute('position', worldPalmPos);
    blast.setAttribute('look-at', forward);
    
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
        blast.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${opacity}; transparent: true; shader: flat; side: double`);
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
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.el.object3D.quaternion);
    
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
      segment.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${0.8 - (i * 0.15)}; transparent: true; shader: flat; side: double`);
      
      // Orient along swipe direction
      segment.setAttribute('look-at', this.el.object3D.position);
      
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
          segment.setAttribute('material', `color: ${this.data.effectColor}; opacity: ${opacity - (i * 0.15)}; transparent: true; shader: flat; side: double`);
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
  
  activateThrusters: function() {
    this.thrusterActive = true;
    
    // Notify for physics movement (could be implemented elsewhere)
    this.el.emit('iron-hand-thruster', {
      hand: this.data.hand,
      active: true
    });
  },
  
  deactivateThrusters: function() {
    this.thrusterActive = false;
    
    // Notify for physics movement
    this.el.emit('iron-hand-thruster', {
      hand: this.data.hand,
      active: false
    });
  }
});