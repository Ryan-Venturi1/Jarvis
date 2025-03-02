/* JARVIS Screen Manager */

// A-Frame component for managing virtual screens
AFRAME.registerComponent('screen-manager', {
    schema: {
      maxScreens: {type: 'number', default: 10},
      defaultWidth: {type: 'number', default: 1.5},
      defaultHeight: {type: 'number', default: 0.9},
      defaultDistance: {type: 'number', default: 1.5}
    },
    
    init: function() {
      this.screens = [];
      this.container = document.querySelector('#ui-container');
      this.camera = document.querySelector('#camera');
      
      if (!this.container) {
        console.warn('Screen container not found, creating one');
        this.container = document.createElement('a-entity');
        this.container.id = 'ui-container';
        this.container.setAttribute('position', '0 1.6 -2');
        this.el.sceneEl.appendChild(this.container);
      }
      
      // Set up event listeners
      this.el.sceneEl.addEventListener('create-screen', this.createScreen.bind(this));
      this.el.sceneEl.addEventListener('create-workspace', this.createWorkspace.bind(this));
      this.el.sceneEl.addEventListener('create-info-panel', this.createInfoPanel.bind(this));
      
      // Load any screen templates
      this.loadTemplates();
    },
    
    loadTemplates: function() {
      // Define screen templates for different purposes
      this.templates = {
        default: {
          width: this.data.defaultWidth,
          height: this.data.defaultHeight,
          color: '#222222',
          opacity: 0.85
        },
        browser: {
          width: this.data.defaultWidth,
          height: this.data.defaultHeight,
          color: '#222222',
          opacity: 0.9,
          hasControls: true
        },
        info: {
          width: 1.2,
          height: 0.8,
          color: '#333344',
          opacity: 0.95
        }
      };
    },
    
    createScreen: function(event) {
      if (this.screens.length >= this.data.maxScreens) {
        console.warn(`Maximum number of screens (${this.data.maxScreens}) reached`);
        return;
      }
      
      // Extract details from event
      const detail = event.detail || {};
      const template = detail.template || 'default';
      const position = detail.position || 'center';
      const url = detail.url || '';
      
      // Get template settings
      const tmpl = this.templates[template] || this.templates.default;
      
      // Create screen entity
      const screen = document.createElement('a-entity');
      screen.classList.add('virtual-screen');
      screen.setAttribute('id', `screen-${this.screens.length}`);
      
      // Calculate position based on camera and placement preference
      const screenPosition = this.calculateScreenPosition(position);
      screen.setAttribute('position', screenPosition);
      
      // Make screen look at user
      screen.setAttribute('look-at', '#camera');
      
      // Add background plane
      const background = document.createElement('a-plane');
      background.setAttribute('width', tmpl.width);
      background.setAttribute('height', tmpl.height);
      background.setAttribute('color', tmpl.color);
      background.setAttribute('opacity', tmpl.opacity);
      
      // Add interaction components
      background.setAttribute('draggable', '');
      background.setAttribute('resizable', '');
      
      screen.appendChild(background);
      
      // Add close button
      const closeButton = document.createElement('a-entity');
      closeButton.setAttribute('geometry', 'primitive: circle; radius: 0.05');
      closeButton.setAttribute('material', 'color: #aa3333; shader: flat');
      closeButton.setAttribute('position', `${tmpl.width/2 - 0.07} ${tmpl.height/2 - 0.07} 0.01`);
      closeButton.setAttribute('button-events', `event: click; targetId: ${screen.id}`);
      
      // Handle close button click
      closeButton.addEventListener('click-trigger', (e) => {
        if (e.detail.target === screen.id) {
          this.removeScreen(screen);
        }
      });
      
      screen.appendChild(closeButton);
      
      // Add content based on type
      if (url) {
        this.addScreenContent(screen, url, tmpl);
      }
      
      // Add to scene
      this.container.appendChild(screen);
      this.screens.push(screen);
      
      // Emit event
      this.el.emit('screen-created', {
        id: screen.id,
        position: screenPosition
      });
      
      // If we have multiple screens, arrange them
      if (this.screens.length > 1) {
        this.arrangeScreens();
      }
      
      return screen;
    },
    
    addScreenContent: function(screen, url, template) {
      // Check for content type based on URL or template
      if (url.startsWith('http')) {
        // Create iframe entity for web content
        if (AFRAME.components.iframe) {
          // If iframe component exists
          const iframe = document.createElement('a-entity');
          iframe.setAttribute('iframe', `url: ${url}; width: ${template.width * 0.95}; height: ${template.height * 0.85}`);
          iframe.setAttribute('position', `0 0 0.02`);
          screen.appendChild(iframe);
        } else {
          // Fallback if iframe component is not available
          const message = document.createElement('a-entity');
          message.setAttribute('text', `value: Web content would load here: ${url}; align: center; width: ${template.width * 0.9}`);
          message.setAttribute('position', '0 0 0.02');
          screen.appendChild(message);
        }
      } else {
        // Text content
        const text = document.createElement('a-entity');
        text.setAttribute('text', `value: ${url}; align: left; width: ${template.width * 0.9}; wrapCount: 40`);
        text.setAttribute('position', `${-template.width/2 + 0.1} ${template.height/2 - 0.2} 0.02`);
        screen.appendChild(text);
      }
    },
    
    calculateScreenPosition: function(position) {
      const camera = this.camera.object3D;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      const distance = this.data.defaultDistance;
      const basePosition = new THREE.Vector3().copy(camera.position).add(forward.multiplyScalar(distance));
      
      switch(position) {
        case 'left':
          return basePosition.add(right.multiplyScalar(-0.7)).toArray().join(' ');
        case 'right':
          return basePosition.add(right.multiplyScalar(0.7)).toArray().join(' ');
        case 'center':
        default:
          return basePosition.toArray().join(' ');
      }
    },
    
    removeScreen: function(screen) {
      const index = this.screens.indexOf(screen);
      if (index !== -1) {
        this.screens.splice(index, 1);
        screen.parentNode.removeChild(screen);
        
        // Rearrange remaining screens
        if (this.screens.length > 0) {
          this.arrangeScreens();
        }
        
        this.el.emit('screen-removed', {
          id: screen.id
        });
      }
    },
    
    arrangeScreens: function() {
      const count = this.screens.length;
      if (count <= 1) return;
      
      // Calculate arc parameters based on screen count
      const arcAngle = Math.min(120, count * 30); // Max 120 degrees
      const angleStep = arcAngle / (count - 1);
      const startAngle = -arcAngle / 2;
      
      // Get camera position for reference
      const camera = this.camera.object3D;
      const cameraPosition = new THREE.Vector3().copy(camera.position);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      
      // Arrange screens in arc
      for (let i = 0; i < count; i++) {
        const screen = this.screens[i];
        
        // Calculate angle for this screen
        const angle = startAngle + (i * angleStep);
        const radians = THREE.MathUtils.degToRad(angle);
        
        // Calculate position on arc
        const distance = this.data.defaultDistance;
        const x = Math.sin(radians) * distance;
        const z = -Math.cos(radians) * distance;
        
        // Create position vector and adjust for camera
        const position = new THREE.Vector3(x, 0, z);
        position.applyQuaternion(camera.quaternion);
        position.add(cameraPosition);
        
        // Set screen position
        screen.setAttribute('position', position.toArray().join(' '));
        
        // Make screen face the camera
        screen.setAttribute('look-at', '#camera');
      }
    },
    
    createWorkspace: function() {
      // Create multiple screens in a workspace layout
      const mainScreen = this.createScreen({
        detail: {
          position: 'center',
          template: 'browser'
        }
      });
      
      const leftScreen = this.createScreen({
        detail: {
          position: 'left',
          template: 'default'
        }
      });
      
      const rightScreen = this.createScreen({
        detail: {
          position: 'right',
          template: 'default'
        }
      });
      
      // Arrange screens
      this.arrangeScreens();
      
      // Emit event
      this.el.emit('workspace-created', {
        screens: this.screens.map(screen => screen.id)
      });
    },
    
    createInfoPanel: function(event) {
      const detail = event.detail || {};
      const title = detail.title || 'Information';
      const content = detail.content || '';
      
      // Create info panel with title and content
      const screen = this.createScreen({
        detail: {
          position: 'center',
          template: 'info',
          url: `${title}\n\n${content}`
        }
      });
      
      return screen;
    }
  });
  
  // Initialize screen manager on scene
  document.addEventListener('DOMContentLoaded', () => {
    // Add screen manager to scene
    const scene = document.querySelector('a-scene');
    if (scene && !scene.hasAttribute('screen-manager')) {
      scene.setAttribute('screen-manager', '');
    }
  });