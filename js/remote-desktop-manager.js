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
          name: 'Google Remote Desktop',
          apps: ['chrome', 'docs', 'sheets', 'drive']
        },
        windows: {
          url: 'ms-rdp://',
          name: 'Windows Remote Desktop',
          apps: ['cmd', 'explorer', 'notepad', 'vscode', 'excel', 'word', 'powerpoint', 'outlook']
        },
        vnc: {
          url: 'vnc://',
          name: 'VNC Connection',
          apps: ['terminal', 'browser', 'files']
        },
        // Add specific workspace connections
        workspace: {
          url: 'https://remotedesktop.google.com/access',
          name: 'Development Workspace',
          apps: ['vscode', 'github', 'terminal', 'browser'],
          arrange: 'dev' // Layout preset
        },
        productivity: {
          url: 'https://workspace.google.com/dashboard',
          name: 'Productivity Suite',
          apps: ['mail', 'calendar', 'docs', 'sheets', 'meet'],
          arrange: 'office' // Layout preset
        }
      };
      
      console.log('Remote Desktop Manager initialized');
    },
    openRemoteApp: function(event) {
        // Extract app details
        const detail = event.detail || {};
        const appName = detail.app || '';
        const position = detail.position || 'center';
        const template = detail.template || 'default';
        
        // Check if this app is available in the template
        const connection = this.connectionTemplates[template];
        if (!connection || (connection.apps && !connection.apps.includes(appName.toLowerCase()))) {
          console.warn(`App ${appName} not available in template ${template}`);
          this.el.emit('notification', {
            message: `Cannot open ${appName}. Not available on this connection.`,
            type: 'warning'
          });
          return;
        }
        
        // Create app-specific URL
        let appUrl = connection.url;
        if (appName) {
          // For Google Workspace apps
          if (template === 'default' || template === 'productivity') {
            if (appName.toLowerCase() === 'docs') {
              appUrl = 'https://docs.google.com/document/u/0/';
            } else if (appName.toLowerCase() === 'sheets') {
              appUrl = 'https://docs.google.com/spreadsheets/u/0/';
            } else if (appName.toLowerCase() === 'slides') {
              appUrl = 'https://docs.google.com/presentation/u/0/';
            } else if (appName.toLowerCase() === 'drive') {
              appUrl = 'https://drive.google.com/drive/u/0/';
            } else if (appName.toLowerCase() === 'mail') {
              appUrl = 'https://mail.google.com/mail/u/0/';
            } else if (appName.toLowerCase() === 'meet') {
              appUrl = 'https://meet.google.com/';
            } else if (appName.toLowerCase() === 'calendar') {
              appUrl = 'https://calendar.google.com/calendar/u/0/';
            } else if (appName.toLowerCase() === 'chrome') {
              appUrl = 'https://google.com';
            }
          }
          // For development apps
          else if (template === 'workspace') {
            if (appName.toLowerCase() === 'github') {
              appUrl = 'https://github.com/';
            } else if (appName.toLowerCase() === 'vscode') {
              appUrl = 'https://vscode.dev/';
            } else if (appName.toLowerCase() === 'browser') {
              appUrl = 'https://google.com';
            }
          }
        }
        
        // Create a title for the app
        const appTitle = appName ? `${appName.charAt(0).toUpperCase() + appName.slice(1)}` : 'Remote App';
        
        // Create a remote desktop screen for this app
        this.el.emit('create-screen', {
          position: position,
          template: 'browser',
          url: appUrl,
          title: appTitle
        });
        
        // Store connection data with app info
        const connectionId = `app-${appName.toLowerCase()}-${Date.now()}`;
        const connectionData = {
          id: connectionId,
          name: appTitle,
          url: appUrl,
          template: template,
          app: appName.toLowerCase(),
          active: true
        };
        
        this.connections.push(connectionData);
        this.activeConnection = connectionData;
        
        // Emit app opened event
        this.el.emit('remote-app-opened', {
          connection: connectionData
        });
        
        console.log(`Remote app opened: ${appTitle}`);
        return connectionData;
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
    
    createWorkspaceWithRemoteDesktops: function(event) {
        const detail = event ? (event.detail || {}) : {};
        const workspaceType = detail.type || 'development';
        
        let workspaceConfig;
        
        // Configure based on workspace type
        if (workspaceType === 'development') {
          workspaceConfig = {
            tabs: [
              { url: 'https://vscode.dev/', title: 'VS Code' },
              { url: 'https://github.com/', title: 'GitHub' }
            ],
            secondaryScreens: true,
            leftScreen: { template: 'workspace', app: 'terminal', position: 'left' },
            rightScreen: { template: 'workspace', app: 'browser', position: 'right' },
            arrangement: 'dev'
          };
        } else if (workspaceType === 'productivity') {
          workspaceConfig = {
            tabs: [
              { url: 'https://mail.google.com/', title: 'Gmail' },
              { url: 'https://calendar.google.com/', title: 'Calendar' }
            ],
            secondaryScreens: true,
            leftScreen: { template: 'productivity', app: 'docs', position: 'left' },
            rightScreen: { template: 'productivity', app: 'sheets', position: 'right' },
            arrangement: 'office'
          };
        } else if (workspaceType === 'media') {
          workspaceConfig = {
            tabs: [
              { url: 'https://youtube.com/', title: 'YouTube' },
              { url: 'https://spotify.com/', title: 'Spotify' }
            ],
            secondaryScreens: true,
            leftScreen: { template: 'default', app: 'chrome', position: 'left' },
            rightScreen: { template: 'default', app: 'chrome', position: 'right' },
            arrangement: 'media'
          };
        } else {
          // Default mixed workspace
          workspaceConfig = {
            tabs: [
              { url: this.connectionTemplates.default.url, title: 'Primary Desktop' },
              { url: 'https://mail.google.com/', title: 'Gmail' }
            ],
            secondaryScreens: true,
            leftScreen: { template: 'windows', position: 'left' },
            rightScreen: { template: 'workspace', app: 'vscode', position: 'right' },
            arrangement: 'mixed'
          };
        }
        
        // Create the workspace with configured tabs
        this.el.emit('create-workspace', workspaceConfig);
        
        // Add additional connections to the secondary screens
        setTimeout(() => {
          if (workspaceConfig.leftScreen) {
            if (workspaceConfig.leftScreen.app) {
              this.el.emit('open-remote-app', {
                template: workspaceConfig.leftScreen.template,
                app: workspaceConfig.leftScreen.app,
                position: 'left'
              });
            } else {
              this.el.emit('open-remote-desktop', {
                template: workspaceConfig.leftScreen.template,
                position: 'left'
              });
            }
          }
          
          if (workspaceConfig.rightScreen) {
            if (workspaceConfig.rightScreen.app) {
              this.el.emit('open-remote-app', {
                template: workspaceConfig.rightScreen.template,
                app: workspaceConfig.rightScreen.app,
                position: 'right'
              });
            } else {
              this.el.emit('open-remote-desktop', {
                template: workspaceConfig.rightScreen.template,
                position: 'right'
              });
            }
          }
          
          // Apply specific arrangement if specified
          if (workspaceConfig.arrangement) {
            this.el.emit('arrange-screens', {
              arrangement: workspaceConfig.arrangement
            });
          }
        }, 1000);
        
        // Emit event about workspace creation
        this.el.emit('workspace-created', {
          type: workspaceType,
          config: workspaceConfig
        });
      }
      
  });
  
  // Initialize component on scene
  document.addEventListener('DOMContentLoaded', () => {
    // Add remote desktop manager to scene
    this.el.addEventListener('open-remote-app', this.openRemoteApp.bind(this));
    const scene = document.querySelector('a-scene');
    if (scene && !scene.hasAttribute('remote-desktop-manager')) {
      scene.setAttribute('remote-desktop-manager', '');
    }
  });