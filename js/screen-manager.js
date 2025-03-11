/* JARVIS Enhanced Screen Manager */

// A-Frame component for managing virtual screens with multiple tabs
AFRAME.registerComponent('screen-manager', {
  schema: {
    maxScreens: {type: 'number', default: 10},
    maxTabsPerScreen: {type: 'number', default: 10},
    defaultWidth: {type: 'number', default: 1.5},
    defaultHeight: {type: 'number', default: 0.9},
    defaultDistance: {type: 'number', default: 1.5}
  },
  
  init: function() {
    this.screens = [];
    this.activeTabsByScreen = {}; // Track active tab for each screen
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
    this.el.sceneEl.addEventListener('add-tab', this.addTab.bind(this));
    this.el.sceneEl.addEventListener('switch-tab', this.switchTab.bind(this));
    
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
        hasControls: true,
        tabs: true
      },
      info: {
        width: 1.2,
        height: 0.8,
        color: '#333344',
        opacity: 0.95
      },
      code: {
        width: this.data.defaultWidth,
        height: this.data.defaultHeight,
        color: '#1e1e1e',
        opacity: 0.95,
        hasControls: true,
        tabs: true
      },
      workspace: {
        width: 1.8,
        height: 1.2,
        color: '#333333',
        opacity: 0.9,
        hasControls: true,
        tabs: true
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
    const title = detail.title || 'New Screen';
    
    // Get template settings
    const tmpl = this.templates[template] || this.templates.default;
    
    // Create screen entity
    const screen = document.createElement('a-entity');
    screen.classList.add('virtual-screen');
    const screenId = `screen-${Date.now()}-${this.screens.length}`;
    screen.setAttribute('id', screenId);
    screen.setAttribute('data-template', template);
    
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
    background.setAttribute('class', 'screen-background');
    
    screen.appendChild(background);
    
    // Add title bar
    this.addTitleBar(screen, tmpl, title);
    
    // Create content container
    const contentContainer = document.createElement('a-entity');
    contentContainer.setAttribute('id', `${screenId}-content`);
    contentContainer.setAttribute('position', `0 ${-0.1} 0.01`); // Below title bar
    screen.appendChild(contentContainer);
    
    // Setup for tabs if the template supports them
    if (tmpl.tabs) {
      this.setupTabs(screen, tmpl);
      
      // Add initial tab with content
      this.addTab({
        detail: {
          screenId: screenId,
          url: url || 'about:blank',
          title: title || 'New Tab'
        }
      });
    } else if (url) {
      // For non-tabbed screens, add content directly
      this.addContentToContainer(contentContainer, url, tmpl);
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
  
  addTitleBar: function(screen, tmpl, title) {
    const titleBar = document.createElement('a-entity');
    titleBar.setAttribute('id', `${screen.id}-title-bar`);
    titleBar.setAttribute('position', `0 ${tmpl.height/2 - 0.075} 0.01`);
    
    // Title bar background
    const titleBg = document.createElement('a-plane');
    titleBg.setAttribute('width', tmpl.width);
    titleBg.setAttribute('height', 0.15);
    titleBg.setAttribute('color', '#111111');
    titleBg.setAttribute('opacity', 0.9);
    titleBar.appendChild(titleBg);
    
    // Title text
    const titleText = document.createElement('a-text');
    titleText.setAttribute('value', title);
    titleText.setAttribute('align', 'center');
    titleText.setAttribute('color', '#ffffff');
    titleText.setAttribute('width', tmpl.width - 0.4);
    titleText.setAttribute('position', '0 0 0.01');
    titleBar.appendChild(titleText);
    
    // Add close button
    const closeButton = document.createElement('a-entity');
    closeButton.setAttribute('geometry', 'primitive: circle; radius: 0.05');
    closeButton.setAttribute('material', 'color: #aa3333; shader: flat');
    closeButton.setAttribute('position', `${tmpl.width/2 - 0.075} 0 0.01`);
    closeButton.setAttribute('button-events', `event: click; targetId: ${screen.id}`);
    
    // Handle close button click
    closeButton.addEventListener('click-trigger', (e) => {
      if (e.detail.target === screen.id) {
        this.removeScreen(screen);
      }
    });
    
    titleBar.appendChild(closeButton);
    screen.appendChild(titleBar);
    
    return titleBar;
  },
  
  setupTabs: function(screen, tmpl) {
    // Create tabs container
    const tabsContainer = document.createElement('a-entity');
    tabsContainer.setAttribute('id', `${screen.id}-tabs`);
    tabsContainer.setAttribute('position', `0 ${tmpl.height/2 - 0.225} 0.01`);
    
    // Tab bar background
    const tabsBg = document.createElement('a-plane');
    tabsBg.setAttribute('width', tmpl.width);
    tabsBg.setAttribute('height', 0.15);
    tabsBg.setAttribute('color', '#222222');
    tabsBg.setAttribute('opacity', 0.9);
    tabsContainer.appendChild(tabsBg);
    
    // Add new tab button
    const newTabBtn = document.createElement('a-entity');
    newTabBtn.setAttribute('geometry', 'primitive: plane; width: 0.1; height: 0.1');
    newTabBtn.setAttribute('material', 'color: #555555; shader: flat');
    newTabBtn.setAttribute('position', `${tmpl.width/2 - 0.1} 0 0.01`);
    newTabBtn.setAttribute('text', 'value: +; align: center; width: 0.5; color: white');
    
    // Handle new tab button click
    newTabBtn.addEventListener('click', () => {
      this.addTab({
        detail: {
          screenId: screen.id,
          title: 'New Tab'
        }
      });
    });
    
    tabsContainer.appendChild(newTabBtn);
    
    // Initialize the tabs array for this screen
    this.activeTabsByScreen[screen.id] = {
      tabs: [],
      activeTab: null
    };
    
    screen.appendChild(tabsContainer);
    return tabsContainer;
  },
  
  addTab: function(event) {
    const { screenId, url, title } = event.detail;
    const screen = document.getElementById(screenId);
    
    if (!screen) {
      console.error(`Screen ${screenId} not found`);
      return;
    }
    
    const screenData = this.activeTabsByScreen[screenId];
    if (!screenData) {
      console.error(`No tab data for screen ${screenId}`);
      return;
    }
    
    // Check if we've reached the max tabs
    if (screenData.tabs.length >= this.data.maxTabsPerScreen) {
      console.warn(`Maximum tabs (${this.data.maxTabsPerScreen}) reached for screen ${screenId}`);
      return;
    }
    
    const tabTitle = title || 'New Tab';
    const tabUrl = url || 'about:blank';
    const tabId = `tab-${screenId}-${Date.now()}`;
    
    // Get screen template
    const templateName = screen.getAttribute('data-template');
    const tmpl = this.templates[templateName] || this.templates.default;
    
    // Create tab button
    const tabsContainer = document.getElementById(`${screenId}-tabs`);
    const tabWidth = Math.min(0.3, (tmpl.width - 0.2) / (screenData.tabs.length + 1));
    
    const tabButton = document.createElement('a-entity');
    tabButton.setAttribute('id', `${tabId}-button`);
    tabButton.setAttribute('geometry', `primitive: plane; width: ${tabWidth}; height: 0.12`);
    tabButton.setAttribute('material', 'color: #333333; shader: flat');
    tabButton.setAttribute('position', `${-tmpl.width/2 + 0.1 + (screenData.tabs.length * tabWidth)} 0 0.01`);
    tabButton.setAttribute('text', `value: ${tabTitle}; align: center; width: 0.5; color: white; wrapCount: 10`);
    
    // Create tab content container
    const contentContainer = document.getElementById(`${screenId}-content`);
    const tabContent = document.createElement('a-entity');
    tabContent.setAttribute('id', tabId);
    tabContent.setAttribute('position', '0 0 0');
    tabContent.setAttribute('visible', 'false'); // Start hidden
    
    // Add content to the tab
    this.addContentToContainer(tabContent, tabUrl, tmpl);
    
    // Add the tab to the containers
    tabsContainer.appendChild(tabButton);
    contentContainer.appendChild(tabContent);
    
    // Add tab data
    const tabData = {
      id: tabId,
      button: tabButton,
      content: tabContent,
      title: tabTitle,
      url: tabUrl
    };
    
    screenData.tabs.push(tabData);
    
    // Handle tab button click
    tabButton.addEventListener('click', () => {
      this.switchTab({
        detail: {
          screenId: screenId,
          tabId: tabId
        }
      });
    });
    
    // Switch to this tab
    this.switchTab({
      detail: {
        screenId: screenId,
        tabId: tabId
      }
    });
    
    return tabData;
  },
  
  switchTab: function(event) {
    const { screenId, tabId } = event.detail;
    const screenData = this.activeTabsByScreen[screenId];
    
    if (!screenData) {
      console.error(`No tab data for screen ${screenId}`);
      return;
    }
    
    // Hide current active tab if any
    if (screenData.activeTab) {
      screenData.activeTab.content.setAttribute('visible', 'false');
      screenData.activeTab.button.setAttribute('material', 'color: #333333');
    }
    
    // Find the requested tab
    const tab = screenData.tabs.find(t => t.id === tabId);
    if (!tab) {
      console.error(`Tab ${tabId} not found in screen ${screenId}`);
      return;
    }
    
    // Show the tab
    tab.content.setAttribute('visible', 'true');
    tab.button.setAttribute('material', 'color: #4c86f1');
    
    // Update active tab
    screenData.activeTab = tab;
  },
  
  addContentToContainer: function(container, url, template) {
    // Check for content type based on URL or template
    if (url.startsWith('http')) {
      // Create iframe entity for web content
      if (AFRAME.components.htmlembed) {
        const iframe = document.createElement('a-entity');
        iframe.setAttribute('htmlembed', `src: ${url}; width: ${template.width - 0.1}; height: ${template.height - 0.35}`);
        iframe.setAttribute('position', '0 -0.1 0.01');
        container.appendChild(iframe);
      } else {
        // Fallback if htmlembed component is not available
        const message = document.createElement('a-entity');
        message.setAttribute('text', `value: Web content would load here: ${url}; align: center; width: ${template.width - 0.2}`);
        message.setAttribute('position', '0 0 0.01');
        container.appendChild(message);
      }
    } else if (url.startsWith('rdp:') || url.startsWith('ms-rdp:')) {
      // Remote desktop connection - create a better visual representation
      const rdpTarget = url.startsWith('rdp:') ? url.substring(4) : url.substring(7);
      const rdpContainer = document.createElement('a-entity');
      rdpContainer.setAttribute('position', '0 0 0.01');
      
      // Add Remote Desktop visual interface
      const rdpInterface = document.createElement('a-plane');
      rdpInterface.setAttribute('width', template.width - 0.2);
      rdpInterface.setAttribute('height', template.height - 0.4);
      rdpInterface.setAttribute('color', '#0078d7'); // Windows blue
      rdpInterface.setAttribute('position', '0 -0.05 0');
      
      // Add Windows logo
      const rdpLogo = document.createElement('a-entity');
      rdpLogo.setAttribute('geometry', 'primitive: plane; width: 0.3; height: 0.3');
      rdpLogo.setAttribute('material', 'color: white; opacity: 0.9');
      rdpLogo.setAttribute('position', '0 0.1 0.01');
      rdpInterface.appendChild(rdpLogo);
      
      // Add connection text
      const rdpText = document.createElement('a-entity');
      rdpText.setAttribute('text', `value: Remote Desktop Connection\n\nTarget: ${rdpTarget || 'Default'}\n\nClick to connect; align: center; width: ${template.width - 0.4}; color: white; wrapCount: 40`);
      rdpText.setAttribute('position', '0 -0.15 0.01');
      rdpInterface.appendChild(rdpText);
      
      // Add connect button
      const rdpConnectBtn = document.createElement('a-entity');
      rdpConnectBtn.setAttribute('geometry', 'primitive: plane; width: 0.4; height: 0.1');
      rdpConnectBtn.setAttribute('material', 'color: #333333');
      rdpConnectBtn.setAttribute('position', '0 -0.3 0.01');
      rdpConnectBtn.setAttribute('text', 'value: Connect; align: center; width: 1; color: white');
      
      // Handle connect button click
      rdpConnectBtn.addEventListener('click', () => {
        rdpText.setAttribute('text', `value: Connecting to ${rdpTarget || 'Default'}...\n\nPlease wait...; align: center; width: ${template.width - 0.4}; color: white; wrapCount: 40`);
        
        // Simulate connection (in a real app, this would open actual RDP)
        setTimeout(() => {
          rdpText.setAttribute('text', `value: Connected to ${rdpTarget || 'Default'}\n\nSession active; align: center; width: ${template.width - 0.4}; color: white; wrapCount: 40`);
          rdpInterface.setAttribute('color', '#444444');
          
          // Notify remote desktop manager
          document.querySelector('a-scene').emit('remote-desktop-connected', {
            target: rdpTarget
          });
        }, 2000);
      });
      
      rdpInterface.appendChild(rdpConnectBtn);
      rdpContainer.appendChild(rdpInterface);
      container.appendChild(rdpContainer);
    } else if (url.startsWith('vnc:')) {
      // VNC connection
      const vncTarget = url.substring(4);
      const vncScreen = document.createElement('a-entity');
      vncScreen.setAttribute('text', `value: VNC Connection to ${vncTarget}\n\nVNC support is coming soon; align: center; width: ${template.width - 0.2}`);
      vncScreen.setAttribute('position', '0 0 0.01');
      container.appendChild(vncScreen);
    } else {
      // Text content
      const text = document.createElement('a-entity');
      text.setAttribute('text', `value: ${url}; align: left; width: ${template.width - 0.2}; wrapCount: 40; color: white`);
      text.setAttribute('position', `${-template.width/2 + 0.1} ${template.height/2 - 0.4} 0.01`);
      container.appendChild(text);
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
      case 'top':
        return basePosition.add(new THREE.Vector3(0, 0.5, 0)).toArray().join(' ');
      case 'bottom':
        return basePosition.add(new THREE.Vector3(0, -0.5, 0)).toArray().join(' ');
      case 'center':
      default:
        return basePosition.toArray().join(' ');
    }
  },
  
  removeScreen: function(screen) {
    const index = this.screens.indexOf(screen);
    if (index !== -1) {
      this.screens.splice(index, 1);
      
      // Clean up tab data
      if (this.activeTabsByScreen[screen.id]) {
        delete this.activeTabsByScreen[screen.id];
      }
      
      // Remove from DOM
      if (screen.parentNode) {
        screen.parentNode.removeChild(screen);
      }
      
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
  
  createWorkspace: function(event) {
    // Extract details from event
    const detail = event.detail || {};
    const tabs = detail.tabs || [];
    
    // Create main workspace screen
    const mainScreen = this.createScreen({
      detail: {
        position: 'center',
        template: 'workspace',
        title: 'Main Workspace'
      }
    });
    
    // Add tabs if provided
    if (tabs.length > 0) {
      tabs.forEach(tab => {
        this.addTab({
          detail: {
            screenId: mainScreen.id,
            url: tab.url,
            title: tab.title
          }
        });
      });
    }
    
    // Add additional screens if requested
    if (detail.secondaryScreens) {
      // Create left and right screens
      const leftScreen = this.createScreen({
        detail: {
          position: 'left',
          template: 'browser',
          title: 'References'
        }
      });
      
      const rightScreen = this.createScreen({
        detail: {
          position: 'right',
          template: 'code',
          title: 'Code Editor'
        }
      });
    }
    
    // Arrange screens
    this.arrangeScreens();
    
    // Emit event
    this.el.emit('workspace-created', {
      mainScreen: mainScreen.id,
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
        url: content,
        title: title
      }
    });
    
    return screen;
  }
});