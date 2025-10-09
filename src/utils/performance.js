// File: utils/performance.js

import { useEffect, useRef } from 'react';

/**
 * Hook to detect and log slow renders
 */
export const useRenderTime = (componentName, threshold = 16) => {
  const renderTime = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const diff = now - renderTime.current;
    
    if (diff > threshold) {
      console.warn(`[Performance] ${componentName} rendered in ${diff}ms (threshold: ${threshold}ms)`);
    }
    
    renderTime.current = now;
  });
};

/**
 * Hook to track component mount/unmount
 */
export const useComponentLifecycle = (componentName) => {
  useEffect(() => {
    const mountTime = Date.now();
    console.log(`[Lifecycle] ${componentName} mounted at ${new Date(mountTime).toISOString()}`);

    return () => {
      const unmountTime = Date.now();
      const lifetime = unmountTime - mountTime;
      console.log(`[Lifecycle] ${componentName} unmounted after ${lifetime}ms`);
    };
  }, [componentName]);
};

/**
 * Monitor Firebase listener subscriptions
 */
export class FirebaseListenerMonitor {
  static listeners = new Map();

  static add(path, listenerType = 'onValue') {
    const count = this.listeners.get(path) || 0;
    this.listeners.set(path, count + 1);
    
    if (count > 0) {
      console.warn(`[Firebase] Multiple listeners (${count + 1}) on path: ${path}`);
    }
  }

  static remove(path) {
    const count = this.listeners.get(path) || 0;
    if (count > 0) {
      this.listeners.set(path, count - 1);
    }
  }

  static getStats() {
    const stats = {};
    this.listeners.forEach((count, path) => {
      if (count > 0) {
        stats[path] = count;
      }
    });
    return stats;
  }

  static printStats() {
    console.table(this.getStats());
  }
}

/**
 * Hook to monitor re-renders
 */
export const useRenderCount = (componentName) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (renderCount.current > 10) {
      console.warn(`[Performance] ${componentName} has re-rendered ${renderCount.current} times`);
    }
  });
  
  return renderCount.current;
};

/**
 * Measure function execution time
 */
export const measurePerformance = async (name, fn) => {
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    console.log(`[Performance] ${name} took ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`[Performance] ${name} failed after ${(end - start).toFixed(2)}ms`, error);
    throw error;
  }
};

/**
 * Track Firebase bandwidth usage (estimates)
 */
export class BandwidthMonitor {
  static totalBytes = 0;
  static operations = [];

  static trackRead(path, dataSize) {
    this.totalBytes += dataSize;
    this.operations.push({
      type: 'read',
      path,
      size: dataSize,
      timestamp: Date.now()
    });
  }

  static trackWrite(path, dataSize) {
    this.totalBytes += dataSize;
    this.operations.push({
      type: 'write',
      path,
      size: dataSize,
      timestamp: Date.now()
    });
  }

  static getStats() {
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentOps = this.operations.filter(op => op.timestamp > last24Hours);
    
    return {
      totalBytes: this.totalBytes,
      totalKB: (this.totalBytes / 1024).toFixed(2),
      totalMB: (this.totalBytes / (1024 * 1024)).toFixed(2),
      operationCount: recentOps.length,
      reads: recentOps.filter(op => op.type === 'read').length,
      writes: recentOps.filter(op => op.type === 'write').length
    };
  }

  static reset() {
    this.totalBytes = 0;
    this.operations = [];
  }
}

/**
 * Memory usage tracker
 */
export const useMemoryMonitor = (componentName, interval = 10000) => {
  useEffect(() => {
    if (!performance.memory) {
      console.warn('Memory API not available');
      return;
    }

    const checkMemory = () => {
      const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
      const usagePercent = ((usedJSHeapSize / jsHeapSizeLimit) * 100).toFixed(2);
      
      if (parseFloat(usagePercent) > 90) {
        console.warn(
          `[Memory] ${componentName} - High memory usage: ${usagePercent}% ` +
          `(${(usedJSHeapSize / 1024 / 1024).toFixed(2)} MB)`
        );
      }
    };

    const intervalId = setInterval(checkMemory, interval);
    return () => clearInterval(intervalId);
  }, [componentName, interval]);
};

/**
 * Network quality detector
 */
export const useNetworkQuality = () => {
  const [quality, setQuality] = React.useState('unknown');

  useEffect(() => {
    if (!navigator.connection) {
      return;
    }

    const updateQuality = () => {
      const { effectiveType, downlink } = navigator.connection;
      
      if (effectiveType === '4g' && downlink > 5) {
        setQuality('excellent');
      } else if (effectiveType === '4g' || (effectiveType === '3g' && downlink > 1)) {
        setQuality('good');
      } else if (effectiveType === '3g') {
        setQuality('fair');
      } else {
        setQuality('poor');
      }
    };

    updateQuality();
    navigator.connection.addEventListener('change', updateQuality);
    
    return () => {
      navigator.connection.removeEventListener('change', updateQuality);
    };
  }, []);

  return quality;
};

/**
 * Detect slow devices
 */
export const detectDeviceCapability = () => {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;
  
  // Check memory (if available)
  const memory = navigator.deviceMemory || 4;
  
  // Estimate device capability
  if (cores >= 8 && memory >= 8) {
    return 'high-end';
  } else if (cores >= 4 && memory >= 4) {
    return 'mid-range';
  } else {
    return 'low-end';
  }
};

/**
 * Adaptive quality settings based on device
 */
export const getAdaptiveSettings = () => {
  const capability = detectDeviceCapability();
  
  const settings = {
    'high-end': {
      imageQuality: 0.8,
      maxImageWidth: 800,
      animationsEnabled: true,
      messageLoadLimit: 100
    },
    'mid-range': {
      imageQuality: 0.7,
      maxImageWidth: 600,
      animationsEnabled: true,
      messageLoadLimit: 50
    },
    'low-end': {
      imageQuality: 0.5,
      maxImageWidth: 400,
      animationsEnabled: false,
      messageLoadLimit: 30
    }
  };

  return settings[capability];
};

export default {
  useRenderTime,
  useComponentLifecycle,
  FirebaseListenerMonitor,
  useRenderCount,
  measurePerformance,
  BandwidthMonitor,
  useMemoryMonitor,
  useNetworkQuality,
  detectDeviceCapability,
  getAdaptiveSettings
};