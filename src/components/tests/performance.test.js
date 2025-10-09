import { 
  measurePerformance, 
  BandwidthMonitor,
  FirebaseListenerMonitor,
  detectDeviceCapability,
  getAdaptiveSettings
} from '../performance';

describe('Performance Utilities', () => {
  describe('measurePerformance', () => {
    it('measures function execution time', async () => {
      const testFn = () => new Promise(resolve => setTimeout(resolve, 100));
      await measurePerformance('test', testFn);
      // Should complete without error
    });

    it('handles errors in measured function', async () => {
      const testFn = () => Promise.reject(new Error('Test error'));
      await expect(measurePerformance('test', testFn)).rejects.toThrow('Test error');
    });
  });

  describe('BandwidthMonitor', () => {
    beforeEach(() => {
      BandwidthMonitor.reset();
    });

    it('tracks read operations', () => {
      BandwidthMonitor.trackRead('test/path', 1024);
      const stats = BandwidthMonitor.getStats();
      expect(stats.totalBytes).toBe(1024);
      expect(stats.reads).toBe(1);
    });

    it('tracks write operations', () => {
      BandwidthMonitor.trackWrite('test/path', 2048);
      const stats = BandwidthMonitor.getStats();
      expect(stats.totalBytes).toBe(2048);
      expect(stats.writes).toBe(1);
    });

    it('calculates total bandwidth', () => {
      BandwidthMonitor.trackRead('test/path', 1024);
      BandwidthMonitor.trackWrite('test/path', 1024);
      const stats = BandwidthMonitor.getStats();
      expect(stats.totalKB).toBe('2.00');
    });
  });

  describe('FirebaseListenerMonitor', () => {
    beforeEach(() => {
      FirebaseListenerMonitor.listeners.clear();
    });

    it('tracks listener additions', () => {
      FirebaseListenerMonitor.add('test/path');
      const stats = FirebaseListenerMonitor.getStats();
      expect(stats['test/path']).toBe(1);
    });

    it('warns about duplicate listeners', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      FirebaseListenerMonitor.add('test/path');
      FirebaseListenerMonitor.add('test/path');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('tracks listener removals', () => {
      FirebaseListenerMonitor.add('test/path');
      FirebaseListenerMonitor.remove('test/path');
      const stats = FirebaseListenerMonitor.getStats();
      expect(stats['test/path']).toBeUndefined();
    });
  });

  describe('detectDeviceCapability', () => {
    it('returns device capability level', () => {
      const capability = detectDeviceCapability();
      expect(['high-end', 'mid-range', 'low-end']).toContain(capability);
    });
  });

  describe('getAdaptiveSettings', () => {
    it('returns settings object', () => {
      const settings = getAdaptiveSettings();
      expect(settings).toHaveProperty('imageQuality');
      expect(settings).toHaveProperty('maxImageWidth');
      expect(settings).toHaveProperty('animationsEnabled');
      expect(settings).toHaveProperty('messageLoadLimit');
    });

    it('returns valid quality values', () => {
      const settings = getAdaptiveSettings();
      expect(settings.imageQuality).toBeGreaterThan(0);
      expect(settings.imageQuality).toBeLessThanOrEqual(1);
    });
  });
});
