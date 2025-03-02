/* NEW FILE: js/notification-system.js */

/* JARVIS Notification System */

// A-Frame component for displaying notifications in the VR environment
AFRAME.registerComponent('notification-system', {
    schema: {
      duration: {type: 'number', default: 3000},
      fadeTime: {type: 'number', default: 500},
      maxNotifications: {type: 'number', default: 3},
      offset: {type: 'vec3', default: {x: 0, y: 0.15, z: -1}}
    },
    
    init: function() {
      // Notification queue
      this.notifications = [];
      this.activeNotifications = [];
      
      // Create container for notifications
      this.container = document.createElement('a-entity');
      this.container.setAttribute('id', 'notification-container');
      this.container.setAttribute('position', '0 0 0');
      this.el.appendChild(this.container);
      
      // Set up event listener
      this.el.addEventListener('notification', this.queueNotification.bind(this));
      
      console.log('JARVIS Notification System initialized');
    },
    
    queueNotification: function(event) {
      const detail = event.detail || {};
      const message = detail.message || 'Notification';
      const type = detail.type || 'info'; // 'info', 'success', 'warning', 'error'
      const duration = detail.duration || this.data.duration;
      
      // Add to queue
      this.notifications.push({
        message: message,
        type: type,
        duration: duration,
        time: Date.now()
      });
      
      // Process queue
      this.processQueue();
    },
    
    processQueue: function() {
      // Check if we have space for more notifications
      if (this.activeNotifications.length >= this.data.maxNotifications) {
        return; // Will be processed when an active notification is removed
      }
      
      // Check if we have notifications in queue
      if (this.notifications.length === 0) {
        return;
      }
      
      // Get next notification
      const notification = this.notifications.shift();
      
      // Create notification entity
      this.createNotification(notification);
      
      // Process more notifications if available
      if (this.notifications.length > 0 && this.activeNotifications.length < this.data.maxNotifications) {
        setTimeout(() => {
          this.processQueue();
        }, 300); // Slight delay between notifications
      }
    },
    
    createNotification: function(notification) {
      const camera = document.getElementById('camera');
      
      // Create notification entity
      const entity = document.createElement('a-entity');
      const id = `notification-${Date.now()}`;
      entity.setAttribute('id', id);
      
      // Determine notification color based on type
      const colors = {
        info: '#4c86f1',     // Blue
        success: '#4CAF50',  // Green
        warning: '#FF9800',  // Orange
        error: '#F44336'     // Red
      };
      const color = colors[notification.type] || colors.info;
      
      // Position relative to camera
      const position = new THREE.Vector3();
      camera.object3D.getWorldPosition(position);
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.object3D.quaternion);
      
      // Add offset to position
      const offset = new THREE.Vector3(
        this.data.offset.x,
        this.data.offset.y - (this.activeNotifications.length * 0.1), // Stack vertically
        this.data.offset.z
      );
      offset.applyQuaternion(camera.object3D.quaternion);
      position.add(offset);
      
      entity.setAttribute('position', position);
      
      // Look at camera
      entity.setAttribute('look-at', '#camera');
      
      // Create background panel
      const panel = document.createElement('a-plane');
      panel.setAttribute('width', '0.6');
      panel.setAttribute('height', '0.1');
      panel.setAttribute('color', '#111');
      panel.setAttribute('opacity', '0.8');
      panel.setAttribute('transparent', 'true');
      
      // Add border based on notification type
      const border = document.createElement('a-plane');
      border.setAttribute('width', '0.62');
      border.setAttribute('height', '0.12');
      border.setAttribute('color', color);
      border.setAttribute('opacity', '0.4');
      border.setAttribute('transparent', 'true');
      border.setAttribute('position', '0 0 -0.001');
      
      // Add icon
      const icon = document.createElement('a-plane');
      icon.setAttribute('width', '0.06');
      icon.setAttribute('height', '0.06');
      icon.setAttribute('position', '-0.25 0 0.001');
      icon.setAttribute('color', color);
      icon.setAttribute('transparent', 'true');
      
      // Add text
      const text = document.createElement('a-text');
      text.setAttribute('value', notification.message);
      text.setAttribute('align', 'left');
      text.setAttribute('position', '-0.2 0 0.001');
      text.setAttribute('width', '1.8');
      text.setAttribute('color', 'white');
      text.setAttribute('baseline', 'center');
      
      // Assemble notification
      entity.appendChild(border);
      entity.appendChild(panel);
      entity.appendChild(icon);
      entity.appendChild(text);
      
      // Add to container
      this.container.appendChild(entity);
      
      // Add to active notifications
      this.activeNotifications.push({
        id: id,
        entity: entity,
        time: notification.time,
        duration: notification.duration
      });
      
      // Set up animations
      // Fade in
      entity.setAttribute('animation__fadein', `property: components.material.material.opacity; from: 0; to: 0.9; dur: ${this.data.fadeTime}; easing: easeOutQuad`);
      
      // Schedule removal
      setTimeout(() => {
        // Fade out
        entity.setAttribute('animation__fadeout', `property: components.material.material.opacity; from: 0.9; to: 0; dur: ${this.data.fadeTime}; easing: easeInQuad`);
        
        // Remove after fade out
        setTimeout(() => {
          this.removeNotification(id);
        }, this.data.fadeTime);
      }, notification.duration);
      
      return entity;
    },
    
    removeNotification: function(id) {
      // Find notification
      const index = this.activeNotifications.findIndex(n => n.id === id);
      if (index === -1) return;
      
      // Get entity
      const notification = this.activeNotifications[index];
      const entity = notification.entity;
      
      // Remove from active notifications
      this.activeNotifications.splice(index, 1);
      
      // Remove from DOM
      if (entity.parentNode) {
        entity.parentNode.removeChild(entity);
      }
      
      // Reposition remaining notifications
      this.repositionNotifications();
      
      // Process queue in case we have more notifications waiting
      this.processQueue();
    },
    
    repositionNotifications: function() {
      const camera = document.getElementById('camera');
      
      this.activeNotifications.forEach((notification, index) => {
        // Position relative to camera
        const position = new THREE.Vector3();
        camera.object3D.getWorldPosition(position);
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.object3D.quaternion);
        
        // Add offset to position
        const offset = new THREE.Vector3(
          this.data.offset.x,
          this.data.offset.y - (index * 0.1), // Stack vertically
          this.data.offset.z
        );
        offset.applyQuaternion(camera.object3D.quaternion);
        position.add(offset);
        
        // Animate to new position
        notification.entity.setAttribute('animation__reposition', `property: position; to: ${position.x} ${position.y} ${position.z}; dur: 300; easing: easeOutQuad`);
      });
    },
    
    tick: function() {
      // Update notification positions relative to camera if needed
      if (this.activeNotifications.length > 0) {
        this.repositionNotifications();
      }
    }
  });
  
  // Initialize notification system on scene
  document.addEventListener('DOMContentLoaded', () => {
    // Add notification system to scene
    const scene = document.querySelector('a-scene');
    if (scene && !scene.hasAttribute('notification-system')) {
      scene.setAttribute('notification-system', '');
    }
  });