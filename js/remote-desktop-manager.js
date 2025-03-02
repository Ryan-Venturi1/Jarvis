/* JARVIS Remote Desktop Manager */

// A-Frame component for managing remote desktop connections
AFRAME.registerComponent('remote-desktop-manager', {
    schema: {
      maxConnections: {type: 'number', default: 10}
    },
    
    init: function() {
      this.connections = [];
      this.activeConnection = null;
      
      // Set up event listeners
      this.el.addEventListener('open-remote-desktop', this.openRemoteDesktop.bind(this));
      this.el.addEventListener('close-remote-desktop', this.closeRemoteDesktop.bind(this));
      this.el.addEventListener('switch-remote-desktop', this.switchRemoteDesktop.bind(this));
      
      // Store connection templates
      this.connectionTemplates = {
        default: {
          url: 'https://remotedesktop.google.com/access',
          name: 'Google Remote Desktop'
        },
        windows: {
          url: 'ms-rdp://',
          name: 'Windows Remote Desktop'
        },
        vnc: {
          url: 'vnc://',
          name: 'VNC Connection'
        }
      };
      
      console.log('Remote Desktop Manager initialized');
    },
    
    openRemoteDesktop: function(event) {
      if (this.connections.length >= this.data.maxConnections) {
        console.warn(`Maximum number of connections (${this.data.maxConnections}) reached`);
        return;
      }
      
      // Extract connection details
      const detail = event.detail || {};
      const template = detail.template || 'default';
      const name = detail.name || this.connectionTemplates[template].name;
      const url = detail.url || this.connectionTemplates[template].url;
      const position = detail.position || 'center';
      
      // Create a remote desktop screen
      this.el.emit('create-screen', {
        position: position,
        template: 'browser',
        url: url,
        title: `Remote: ${name}`
      });
      
      // Store connection data
      const connection = {
        id: `rdp-${Date.now()}`,
        name: name,
        url: url,
        template: template,
        active: true
      };
      
      this.connections.push(connection);
      this.activeConnection = connection;
      
      // Emit connection opened event
      this.el.emit('remote-desktop-opened', {
        connection: connection
      });
      
      console.log(`Remote desktop opened: ${name}`);
      return connection;
    },
    
    closeRemoteDesktop: function(event) {
      const detail = event.detail || {};
      const id = detail.id;
      
      if (!id) {
        console.warn('No connection ID provided for closing');
        return;
      }
      
      // Find the connection
      const index = this.connections.findIndex(conn => conn.id === id);
      if (index === -1) {
        console.warn(`Connection ${id} not found`);
        return;
      }
      
      // Remove the connection
      const connection = this.connections[index];
      this.connections.splice(index, 1);
      
      // Update active connection if needed
      if (this.activeConnection && this.activeConnection.id === id) {
        this.activeConnection = this.connections.length > 0 ? this.connections[0] : null;
      }
      
      // Emit connection closed event
      this.el.emit('remote-desktop-closed', {
        connection: connection
      });
      
      console.log(`Remote desktop closed: ${connection.name}`);
    },
    
    switchRemoteDesktop: function(event) {
      const detail = event.detail || {};
      const id = detail.id;
      
      if (!id) {
        console.warn('No connection ID provided for switching');
        return;
      }
      
      // Find the connection
      const connection = this.connections.find(conn => conn.id === id);
      if (!connection) {
        console.warn(`Connection ${id} not found`);
        return;
      }
      
      // Switch to this connection
      this.activeConnection = connection;
      
      // Emit connection switched event
      this.el.emit('remote-desktop-switched', {
        connection: connection
      });
      
      console.log(`Switched to remote desktop: ${connection.name}`);
    },
    
    getActiveConnection: function() {
      return this.activeConnection;
    },
    
    getAllConnections: function() {
      return this.connections;
    },
    
    createWorkspaceWithRemoteDesktops: function() {
      // Create a workspace with multiple remote desktop screens
      const workspace = {
        tabs: [
          { url: this.connectionTemplates.default.url, title: 'Primary Desktop' }
        ],
        secondaryScreens: true
      };
      
      // Create the workspace
      this.el.emit('create-workspace', workspace);
      
      // Add additional connections to the secondary screens
      setTimeout(() => {
        // Add Windows RDP to left screen
        this.el.emit('open-remote-desktop', {
          template: 'windows',
          position: 'left'
        });
        
        // Add VNC to right screen
        this.el.emit('open-remote-desktop', {
          template: 'vnc',
          position: 'right'
        });
      }, 1000);
    }
  });
  
  // Initialize component on scene
  document.addEventListener('DOMContentLoaded', () => {
    // Add remote desktop manager to scene
    const scene = document.querySelector('a-scene');
    if (scene && !scene.hasAttribute('remote-desktop-manager')) {
      scene.setAttribute('remote-desktop-manager', '');
    }
  });