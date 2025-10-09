import { cleanupOldPhotos } from '../cleanup';
import { ref, get, remove } from 'firebase/database';

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(),
  remove: jest.fn()
}));

jest.mock('../../firebase', () => ({
  database: {}
}));

describe('Cleanup Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes photos older than 24 hours', async () => {
    const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    const recentTimestamp = Date.now() - (1 * 60 * 60 * 1000); // 1 hour ago

    get.mockResolvedValue({
      exists: () => true,
      val: () => ({
        photo1: { timestamp: oldTimestamp },
        photo2: { timestamp: recentTimestamp }
      })
    });

    remove.mockResolvedValue(undefined);

    await cleanupOldPhotos();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('handles empty photo collection', async () => {
    get.mockResolvedValue({
      exists: () => false,
      val: () => null
    });

    await expect(cleanupOldPhotos()).resolves.not.toThrow();
  });

  it('handles cleanup errors gracefully', async () => {
    get.mockRejectedValue(new Error('Database error'));
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    await cleanupOldPhotos();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});