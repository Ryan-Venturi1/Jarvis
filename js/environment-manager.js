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
        console.log('Enabling Stark Industries lab environment');

        // In Lab mode, show the environment with enhanced settings
        if (this.environment) {
          this.environment.setAttribute('visible', true);
          this.environment.setAttribute('environment', {
            preset: 'starship',         // More futuristic setting
            lighting: 'point',          // Dramatic lighting
            shadow: true,               // Enable shadows
            ground: 'flat',             // Flat ground
            groundColor: '#111',        // Dark floor
            groundColor2: '#222',       // Gradient floor
            dressing: 'apparatus',      // High-tech equipment 
            dressingAmount: 15,         // More objects
            dressingColor: '#3a75e0',   // Stark blue accents
            dressingScale: 1.2,         // Larger objects
            dressingVariance: '2 1 2',  // More variance in equipment
            dressingUniformScale: false,// Allow non-uniform scaling
            fog: 0.2,                   // Light atmospheric fog
            grid: '1x1',                // Grid pattern
            gridColor: '#4c86f1'        // Stark blue grid
          });
        }

        if (this.floor) {
          this.floor.setAttribute('visible', true);
          // Add reflective property to floor
          this.floor.setAttribute('material', 'color: #111; opacity: 0.9; metalness: 0.5; roughness: 0.2');
        }

        // Add enhanced lab-specific elements
        this.addEnhancedLabElements();

        // Adjust existing screens for Lab
        this.adjustScreensForAR(false);

        // Reset scene background
        this.el.sceneEl.setAttribute('background', {color: '#000'});
      },

      // NEW FUNCTION - Add this after addLabElements function:
      addEnhancedLabElements: function() {
        const scene = this.el.sceneEl;

        // Check if we already added enhanced lab elements
        if (document.getElementById('enhanced-lab-elements')) {
          document.getElementById('enhanced-lab-elements').setAttribute('visible', true);
          return;
        }

        // Create container for enhanced lab elements
        const labElements = document.createElement('a-entity');
        labElements.setAttribute('id', 'enhanced-lab-elements');

        // ---- Add Iron Man suit display ----
        const suitDisplay = document.createElement('a-entity');
        suitDisplay.setAttribute('id', 'ironman-suit-display');
        suitDisplay.setAttribute('position', '0 0 -3');

        // Pedestal
        const pedestal = document.createElement('a-cylinder');
        pedestal.setAttribute('radius', '0.5');
        pedestal.setAttribute('height', '0.1');
        pedestal.setAttribute('position', '0 0.05 0');
        pedestal.setAttribute('material', 'color: #333; metalness: 0.8; roughness: 0.2');
        suitDisplay.appendChild(pedestal);

        // Holographic suit outline
        const suitHolo = document.createElement('a-entity');
        suitHolo.setAttribute('position', '0 0.9 0');
        suitHolo.setAttribute('scale', '0.8 0.8 0.8');

        // Create simplified Iron Man shape
        const suitParts = [
          { type: 'sphere', position: '0 0.5 0', scale: '0.3 0.3 0.3' }, // Head
          { type: 'box', position: '0 0.15 0', scale: '0.6 0.4 0.2' },    // Chest
          { type: 'box', position: '0 -0.2 0', scale: '0.4 0.3 0.2' },    // Abdomen
          { type: 'box', position: '-0.25 0.15 0', scale: '0.15 0.4 0.2' }, // Left arm
          { type: 'box', position: '0.25 0.15 0', scale: '0.15 0.4 0.2' },  // Right arm
          { type: 'box', position: '-0.2 -0.5 0', scale: '0.15 0.5 0.2' },  // Left leg
          { type: 'box', position: '0.2 -0.5 0', scale: '0.15 0.5 0.2' }    // Right leg
        ];

        suitParts.forEach((part, index) => {
          const element = document.createElement('a-entity');
          element.setAttribute('geometry', `primitive: ${part.type}`);
          element.setAttribute('position', part.position);
          element.setAttribute('scale', part.scale);
          element.setAttribute('material', 'color: #4c86f1; opacity: 0.3; transparent: true; wireframe: true; emissive: #4c86f1; emissiveIntensity: 0.5');
          suitHolo.appendChild(element);
        });

        // Add rotation animation
        suitHolo.setAttribute('animation', 'property: rotation; to: 0 360 0; dur: 20000; easing: linear; loop: true');

        // Add glow effect
        const suitGlow = document.createElement('a-light');
        suitGlow.setAttribute('type', 'point');
        suitGlow.setAttribute('color', '#4c86f1');
        suitGlow.setAttribute('intensity', '0.5');
        suitGlow.setAttribute('distance', '2');
        suitGlow.setAttribute('animation', 'property: intensity; to: 0.8; dur: 2000; dir: alternate; easing: easeInOutSine; loop: true');
        suitHolo.appendChild(suitGlow);

        suitDisplay.appendChild(suitHolo);
        labElements.appendChild(suitDisplay);

        // ---- Add holographic workstations ----
        const workstationPositions = [
          { x: -2.5, y: 0, z: -1.5, ry: 30 },
          { x: 2.5, y: 0, z: -1.5, ry: -30 }
        ];

        workstationPositions.forEach((pos, index) => {
          const workstation = document.createElement('a-entity');
          workstation.setAttribute('id', `holo-workstation-${index}`);
          workstation.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
          workstation.setAttribute('rotation', `0 ${pos.ry} 0`);

          // Create desk
          const desk = document.createElement('a-box');
          desk.setAttribute('width', '1.5');
          desk.setAttribute('depth', '0.8');
          desk.setAttribute('height', '0.05');
          desk.setAttribute('position', '0 0.75 0');
          desk.setAttribute('material', 'color: #222; opacity: 0.9; metalness: 0.7; roughness: 0.2');

          // Create holographic screens above desk
          const screen1 = document.createElement('a-entity');
          screen1.setAttribute('geometry', 'primitive: plane; width: 1.2; height: 0.7');
          screen1.setAttribute('position', '0 1.25 -0.2');
          screen1.setAttribute('rotation', '-20 0 0');
          screen1.setAttribute('material', 'color: #4c86f1; opacity: 0.7; transparent: true; side: double');

          // Add data visualization effect
          const dataViz = document.createElement('a-entity');
          dataViz.setAttribute('geometry', 'primitive: plane; width: 1.15; height: 0.65');
          dataViz.setAttribute('position', '0 0 0.01');
          dataViz.setAttribute('material', 'shader: flat; opacity: 0.9; transparent: true; src: #data-texture');
          screen1.appendChild(dataViz);

          // Create multiple smaller screens
          const screen2 = document.createElement('a-entity');
          screen2.setAttribute('geometry', 'primitive: plane; width: 0.5; height: 0.4');
          screen2.setAttribute('position', '-0.5 1.6 -0.3');
          screen2.setAttribute('rotation', '-20 20 0');
          screen2.setAttribute('material', 'color: #15ACCF; opacity: 0.7; transparent: true; side: double');

          const screen3 = document.createElement('a-entity');
          screen3.setAttribute('geometry', 'primitive: plane; width: 0.5; height: 0.4');
          screen3.setAttribute('position', '0.5 1.6 -0.3');
          screen3.setAttribute('rotation', '-20 -20 0');
          screen3.setAttribute('material', 'color: #15ACCF; opacity: 0.7; transparent: true; side: double');

          // Add screens to workstation
          workstation.appendChild(desk);
          workstation.appendChild(screen1);
          workstation.appendChild(screen2);
          workstation.appendChild(screen3);

          // Add desk chair
          const chair = document.createElement('a-entity');
          chair.setAttribute('position', '0 0 0.6');

          const chairSeat = document.createElement('a-box');
          chairSeat.setAttribute('width', '0.6');
          chairSeat.setAttribute('depth', '0.6');
          chairSeat.setAttribute('height', '0.1');
          chairSeat.setAttribute('position', '0 0.4 0');
          chairSeat.setAttribute('material', 'color: #333');

          const chairBack = document.createElement('a-box');
          chairBack.setAttribute('width', '0.6');
          chairBack.setAttribute('depth', '0.1');
          chairBack.setAttribute('height', '0.6');
          chairBack.setAttribute('position', '0 0.7 -0.25');
          chairBack.setAttribute('material', 'color: #333');

          chair.appendChild(chairSeat);
          chair.appendChild(chairBack);
          workstation.appendChild(chair);

          labElements.appendChild(workstation);
        });

        // ---- Add laboratory equipment ----
        const labEquipment = document.createElement('a-entity');
        labEquipment.setAttribute('id', 'lab-equipment');
        labEquipment.setAttribute('position', '0 0 -5');

        // Create equipment racks
        const rackPositions = [
          { x: -4, y: 0, z: 0, ry: 90 },
          { x: 4, y: 0, z: 0, ry: -90 },
          { x: 0, y: 0, z: -2, ry: 0 }
        ];

        rackPositions.forEach((pos, index) => {
          const rack = document.createElement('a-entity');
          rack.setAttribute('id', `equipment-rack-${index}`);
          rack.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
          rack.setAttribute('rotation', `0 ${pos.ry} 0`);

          // Create rack frame
          const frame = document.createElement('a-box');
          frame.setAttribute('width', '1.5');
          frame.setAttribute('depth', '0.8');
          frame.setAttribute('height', '2.2');
          frame.setAttribute('position', '0 1.1 0');
          frame.setAttribute('material', 'color: #333; opacity: 0.9; metalness: 0.7; roughness: 0.3; wireframe: true');

          // Add shelves
          for (let i = 0; i < 4; i++) {
            const shelf = document.createElement('a-box');
            shelf.setAttribute('width', '1.5');
            shelf.setAttribute('depth', '0.8');
            shelf.setAttribute('height', '0.05');
            shelf.setAttribute('position', `0 ${0.1 + i * 0.7} 0`);
            shelf.setAttribute('material', 'color: #444; metalness: 0.7; roughness: 0.3');
            rack.appendChild(shelf);

            // Add random equipment to each shelf
            const equipmentCount = 1 + Math.floor(Math.random() * 3);
            for (let j = 0; j < equipmentCount; j++) {
              const equipment = document.createElement('a-entity');

              // Randomize equipment type
              const equipType = Math.floor(Math.random() * 3);
              if (equipType === 0) {
                // Box-shaped device
                equipment.setAttribute('geometry', 'primitive: box');
                equipment.setAttribute('scale', `${0.2 + Math.random() * 0.2} ${0.1 + Math.random() * 0.2} ${0.2 + Math.random() * 0.2}`);
              } else if (equipType === 1) {
                // Cylindrical device
                equipment.setAttribute('geometry', 'primitive: cylinder');
                equipment.setAttribute('scale', `${0.1 + Math.random() * 0.1} ${0.1 + Math.random() * 0.3} ${0.1 + Math.random() * 0.1}`);
              } else {
                // Spherical device
                equipment.setAttribute('geometry', 'primitive: sphere');
                equipment.setAttribute('scale', `${0.1 + Math.random() * 0.15} ${0.1 + Math.random() * 0.15} ${0.1 + Math.random() * 0.15}`);
              }

              // Position on shelf
              equipment.setAttribute('position', `${-0.5 + j * 0.5} ${0.1 + i * 0.7 + 0.15} ${-0.2 + Math.random() * 0.4}`);

              // Random color with tech look
              const colors = ['#4c86f1', '#15ACCF', '#FF5722', '#3a75e0', '#444'];
              const colorIndex = Math.floor(Math.random() * colors.length);
              equipment.setAttribute('material', `color: ${colors[colorIndex]}; metalness: 0.8; roughness: 0.2`);

              // Add random blinking light to some equipment
              if (Math.random() > 0.7) {
                const light = document.createElement('a-entity');
                light.setAttribute('geometry', 'primitive: sphere; radius: 0.02');
                light.setAttribute('position', `0 ${0.05 + Math.random() * 0.05} 0.1`);
                light.setAttribute('material', 'color: #FF5722; emissive: #FF5722; emissiveIntensity: 0.8');
                light.setAttribute('animation', 'property: material.emissiveIntensity; to: 0.2; dur: 1000; dir: alternate; easing: easeInOutSine; loop: true');
                equipment.appendChild(light);
              }

              rack.appendChild(equipment);
            }
          }

          labEquipment.appendChild(rack);
        });

        labElements.appendChild(labEquipment);

        // Add atmospheric effects
        const atmosphere = document.createElement('a-entity');
        atmosphere.setAttribute('id', 'lab-atmosphere');

        // Add some ambient particles
        for (let i = 0; i < 20; i++) {
          const particle = document.createElement('a-entity');

          // Random position within the lab
          const px = -5 + Math.random() * 10;
          const py = 0.5 + Math.random() * 2.5;
          const pz = -5 + Math.random() * 5;

          particle.setAttribute('geometry', 'primitive: sphere; radius: 0.03');
          particle.setAttribute('position', `${px} ${py} ${pz}`);
          particle.setAttribute('material', 'color: #4c86f1; opacity: 0.3; transparent: true; emissive: #4c86f1; emissiveIntensity: 0.5');

          // Add floating animation
          const animDuration = 5000 + Math.random() * 5000;
          const floatHeight = 0.1 + Math.random() * 0.3;
          particle.setAttribute('animation', `property: position; to: ${px} ${py + floatHeight} ${pz}; dur: ${animDuration}; dir: alternate; easing: easeInOutSine; loop: true`);

          // Add pulsing animation
          particle.setAttribute('animation__pulse', 'property: material.opacity; to: 0.1; dur: 2000; dir: alternate; easing: easeInOutSine; loop: true');

          atmosphere.appendChild(particle);
        }

        labElements.appendChild(atmosphere);

        // Add to scene
        scene.appendChild(labElements);

        // Create and add data visualization texture if not already present
        if (!document.querySelector('#data-texture')) {
          const assets = document.querySelector('a-assets') || document.createElement('a-assets');

          const dataImg = document.createElement('img');
          dataImg.setAttribute('id', 'data-texture');
          dataImg.setAttribute('src', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iNTEyIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzAzMDMxMCIgLz48dGV4dCB4PSIyMCIgeT0iMzAiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM0Yzg2ZjEiPkpBUlZJUyBPUEVSQVRJTkcgU1lTVEVNIHYxMC4zLjQ8L3RleHQ+PHRleHQgeD0iMjAiIHk9IjYwIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNGM4NmYxIj5TeXN0ZW0gU3RhdHVzOiBPTkxJTkU8L3RleHQ+PHRleHQgeD0iMjAiIHk9IjgwIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjNGM4NmYxIj5TZWNob2UgU2VjdXJpdHk6IEFDVEJWRSBNT05JVE9SSU5HPC90ZXh0PjxjaXJjbGUgY3g9IjIwIiBjeT0iMTIwIiByPSI1IiBmaWxsPSIjNGM4NmYxIj48YW5pbWF0ZSBhdHRyaWJ1dGVOYW1lPSJvcGFjaXR5IiB2YWx1ZXM9IjE7MC41OzE7MSIgZHVyPSIycyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiIC8+PC9jaXJjbGU+PHRleHQgeD0iMzUiIHk9IjEyNSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzRjODZmMSI+QVJDIFJlYWN0b3I6IE5vbWluYWw8L3RleHQ+PGNpcmNsZSBjeD0iMjAiIGN5PSIxNDAiIHI9IjUiIGZpbGw9IiM0Yzg2ZjEiPjxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9Im9wYWNpdHkiIHZhbHVlcz0iMTswLjU7MTsxIiBkdXI9IjIuNXMiIHJlcGVhdENvdW50PSJpbmRlZmluaXRlIiAvPjwvY2lyY2xlPjx0ZXh0IHg9IjM1IiB5PSIxNDUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM0Yzg2ZjEiPlNlY3VyaXR5IFN5c3RlbXM6IE9OTElORTwvdGV4dD48cGF0aCBkPSJNMTAwIDIwMCBMMTUwIDE3MCBMMjAwIDIxMCBMMjUwIDE4MCBMMzAwIDIzMCBMMzUwIDE5MCBMNDAwIDIxMCBMNDUwIDE4MCIgc3Ryb2tlPSIjNGM4NmYxIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIC8+PHBhdGggZD0iTTEwMCAyNTAgTDE1MCAyNDAgTDIwMCAyNjAgTDI1MCAyMzAgTDMwMCAyNTAgTDM1MCAyMzAgTDQwMCAyNTAgTDQ1MCAyMzAiIHN0cm9rZT0iIzE1QUNDRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiAvPjwvc3ZnPg==' );

          if (!document.querySelector('a-assets')) {
            scene.appendChild(assets);
          }

          document.querySelector('a-assets').appendChild(dataImg);
        }
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
              // Enhanced passthrough configuration for Quest
              this.el.sceneEl.setAttribute('xr', {
                requiredFeatures: ['local-floor', 'hit-test'],
                optionalFeatures: ['dom-overlay', 'hand-tracking', 'anchors', 'plane-detection', 'mesh-detection', 'depth-sensing', 'light-estimation'],
                overlayElement: document.querySelector('#ui-overlay') || document.body
              });
              
              // Ensure scene background is completely transparent for passthrough
              this.el.sceneEl.setAttribute('background', {color: 'transparent'});
              
              // Configure renderer for optimal passthrough quality
              const renderer = this.el.sceneEl.renderer;
              if (renderer) {
                renderer.setClearAlpha(0);
                renderer.xr.enabled = true;
              }
              
              // Notify users that they can enter AR
              this.el.emit('create-info-panel', {
                title: 'AR Mode Ready',
                content: 'Click the VR button to enter augmented reality passthrough mode on your Quest.'
              });
              
              console.log('AR passthrough configured for Meta Quest');
            } else {
              console.log('AR not supported on this device.');
              this.el.emit('create-info-panel', {
                title: 'AR Not Available',
                content: 'Your device does not support AR mode. Using Lab mode instead.'
              });
            }
          })
          .catch(error => {
            console.error('Error checking for AR support:', error);
            this.el.emit('create-info-panel', {
              title: 'AR Error',
              content: 'Error initializing AR mode. Using Lab mode instead.'
            });
          });
      }
    },
  });