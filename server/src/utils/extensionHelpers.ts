/**
 * ExtensionCraft Runtime Helper Libraries
 * Injected into extensions for Plasmo-style Storage/Messaging/CSUI and Addfox Shadow DOM style isolation.
 */

export const RUNTIME_STORAGE_HELPER = `
// Plasmo-inspired Type-Safe Reactive Storage Utility
(function(global) {
  class ExtensionStorage {
    constructor(area = 'local') {
      this.area = area;
    }

    get storageArea() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage[this.area]) {
        return chrome.storage[this.area];
      }
      if (typeof browser !== 'undefined' && browser.storage && browser.storage[this.area]) {
        return browser.storage[this.area];
      }
      return null;
    }

    async get(key, defaultValue = null) {
      const storage = this.storageArea;
      if (!storage) return defaultValue;
      return new Promise((resolve) => {
        storage.get([key], (result) => {
          if (chrome.runtime.lastError || !result || result[key] === undefined) {
            resolve(defaultValue);
          } else {
            try {
              resolve(typeof result[key] === 'string' ? JSON.parse(result[key]) : result[key]);
            } catch (e) {
              resolve(result[key]);
            }
          }
        });
      });
    }

    async set(key, value) {
      const storage = this.storageArea;
      if (!storage) return;
      const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
      return new Promise((resolve, reject) => {
        storage.set({ [key]: serialized }, () => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(true);
        });
      });
    }

    async remove(key) {
      const storage = this.storageArea;
      if (!storage) return;
      return new Promise((resolve) => {
        storage.remove([key], () => resolve(true));
      });
    }

    watch(key, callback) {
      if (typeof chrome === 'undefined' || !chrome.storage) return () => {};
      const listener = (changes, areaName) => {
        if (areaName === this.area && changes[key]) {
          let newValue = changes[key].newValue;
          try { newValue = JSON.parse(newValue); } catch(e) {}
          let oldValue = changes[key].oldValue;
          try { oldValue = JSON.parse(oldValue); } catch(e) {}
          callback(newValue, oldValue);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }

  global.ExtensionStorage = ExtensionStorage;
  global.storage = new ExtensionStorage('local');
})(typeof window !== 'undefined' ? window : self);
`

export const RUNTIME_MESSAGING_HELPER = `
// Plasmo-inspired Structured Extension Messaging Bus
(function(global) {
  class ExtensionMessaging {
    static async sendToBackground(name, body = {}) {
      return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime) {
          return reject(new Error('Extension runtime unavailable'));
        }
        chrome.runtime.sendMessage({ name, body }, (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (response && response.error) {
            return reject(new Error(response.error));
          }
          resolve(response ? response.data : undefined);
        });
      });
    }

    static async sendToTab(tabId, name, body = {}) {
      return new Promise((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.tabs) {
          return reject(new Error('chrome.tabs API unavailable'));
        }
        chrome.tabs.sendMessage(tabId, { name, body }, (response) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (response && response.error) {
            return reject(new Error(response.error));
          }
          resolve(response ? response.data : undefined);
        });
      });
    }

    static onMessage(handler) {
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || !message.name) return false;
        
        Promise.resolve()
          .then(() => handler(message, sender))
          .then((data) => sendResponse({ data }))
          .catch((error) => sendResponse({ error: error.message || 'Messaging error' }));

        return true; // Keep channel open for async response
      });
    }
  }

  global.ExtensionMessaging = ExtensionMessaging;
})(typeof window !== 'undefined' ? window : self);
`

export const RUNTIME_SHADOWDOM_HELPER = `
// Addfox-inspired Shadow DOM Injection Framework for Content Scripts
(function(global) {
  class ExtensionShadowDOM {
    static createContainer({ id = 'ext-shadow-root', css = '' } = {}) {
      let host = document.getElementById(id);
      if (host) return host.shadowRoot;

      host = document.createElement('div');
      host.id = id;
      host.style.position = 'absolute';
      host.style.top = '0';
      host.style.left = '0';
      host.style.zIndex = '2147483647';
      
      const shadowRoot = host.attachShadow({ mode: 'open' });
      
      if (css) {
        const style = document.createElement('style');
        style.textContent = css;
        shadowRoot.appendChild(style);
      }

      // Shield host events from being intercepted by the main document
      host.addEventListener('keydown', (e) => e.stopPropagation());
      host.addEventListener('keyup', (e) => e.stopPropagation());

      document.body.appendChild(host);
      return shadowRoot;
    }
  }

  global.ExtensionShadowDOM = ExtensionShadowDOM;
})(typeof window !== 'undefined' ? window : self);
`

export const RUNTIME_CSUI_HELPER = `
// Plasmo-inspired Content Script UI (CSUI) Life-Cycle & Mounting Framework
(function(global) {
  class ExtensionCSUI {
    static mount({ targetSelector = 'body', position = 'append', render, css = '', id = 'ext-csui-mount' }) {
      const container = document.querySelector(targetSelector) || document.body;
      let host = document.getElementById(id);

      if (!host) {
        host = document.createElement('div');
        host.id = id;
        
        const shadow = host.attachShadow({ mode: 'open' });
        if (css) {
          const styleElement = document.createElement('style');
          styleElement.textContent = css;
          shadow.appendChild(styleElement);
        }

        const mountPoint = document.createElement('div');
        mountPoint.className = 'csui-content';
        shadow.appendChild(mountPoint);

        if (position === 'prepend') {
          container.insertBefore(host, container.firstChild);
        } else {
          container.appendChild(host);
        }

        if (typeof render === 'function') {
          render(mountPoint, shadow);
        }
      }
      return host;
    }

    static unmount(id = 'ext-csui-mount') {
      const host = document.getElementById(id);
      if (host && host.parentNode) {
        host.parentNode.removeChild(host);
      }
    }
  }

  global.ExtensionCSUI = ExtensionCSUI;
})(typeof window !== 'undefined' ? window : self);
`
