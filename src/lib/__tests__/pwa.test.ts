import { 
  registerServiceWorker, 
  unregisterServiceWorker, 
  checkForUpdates,
  isStandalone,
  canInstallPWA,
  promptInstall
} from '../pwa'

describe('PWA Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Reset navigator mock
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        register: jest.fn(),
        ready: Promise.resolve({
          unregister: jest.fn(),
          update: jest.fn(),
        }),
        getRegistration: jest.fn(),
      },
      writable: true,
    })
  })

  describe('registerServiceWorker', () => {
    it('should register service worker successfully', async () => {
      const mockRegistration = { scope: '/' }
      navigator.serviceWorker.register = jest.fn().mockResolvedValue(mockRegistration)

      const result = await registerServiceWorker('/sw.js')

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js')
      expect(result).toBe(mockRegistration)
    })

    it('should handle registration failure', async () => {
      const error = new Error('Registration failed')
      navigator.serviceWorker.register = jest.fn().mockRejectedValue(error)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await registerServiceWorker('/sw.js')

      expect(consoleSpy).toHaveBeenCalledWith('Service worker registration failed:', error)
      expect(result).toBeNull()

      consoleSpy.mockRestore()
    })

    it('should return null when service worker is not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
      })

      const result = await registerServiceWorker('/sw.js')

      expect(result).toBeNull()
    })
  })

  describe('unregisterServiceWorker', () => {
    it('should unregister service worker successfully', async () => {
      const mockRegistration = { unregister: jest.fn().mockResolvedValue(true) }
      navigator.serviceWorker.getRegistration = jest.fn().mockResolvedValue(mockRegistration)

      const result = await unregisterServiceWorker()

      expect(mockRegistration.unregister).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('should handle unregistration failure', async () => {
      const error = new Error('Unregistration failed')
      const mockRegistration = { unregister: jest.fn().mockRejectedValue(error) }
      navigator.serviceWorker.getRegistration = jest.fn().mockResolvedValue(mockRegistration)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await unregisterServiceWorker()

      expect(consoleSpy).toHaveBeenCalledWith('Service worker unregistration failed:', error)
      expect(result).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('checkForUpdates', () => {
    it('should check for updates successfully', async () => {
      const mockRegistration = { update: jest.fn().mockResolvedValue(undefined) }
      navigator.serviceWorker.ready = Promise.resolve(mockRegistration as any)

      await checkForUpdates()

      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('should handle update check failure', async () => {
      const error = new Error('Update check failed')
      const mockRegistration = { update: jest.fn().mockRejectedValue(error) }
      navigator.serviceWorker.ready = Promise.resolve(mockRegistration as any)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      await checkForUpdates()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to check for updates:', error)

      consoleSpy.mockRestore()
    })
  })

  describe('isStandalone', () => {
    it('should return true when app is in standalone mode', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
      })

      expect(isStandalone()).toBe(true)
    })

    it('should return true when display mode is standalone', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockReturnValue({ matches: true }),
        writable: true,
      })

      expect(isStandalone()).toBe(true)
    })

    it('should return false when not in standalone mode', () => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        writable: true,
      })
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockReturnValue({ matches: false }),
        writable: true,
      })

      expect(isStandalone()).toBe(false)
    })
  })

  describe('canInstallPWA', () => {
    it('should return true when beforeinstallprompt event is available', () => {
      const mockEvent = { prompt: jest.fn() }
      
      expect(canInstallPWA(mockEvent as any)).toBe(true)
    })

    it('should return false when no install prompt is available', () => {
      expect(canInstallPWA(null)).toBe(false)
    })
  })

  describe('promptInstall', () => {
    it('should prompt installation successfully', async () => {
      const mockEvent = {
        prompt: jest.fn().mockResolvedValue(undefined),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      }

      const result = await promptInstall(mockEvent as any)

      expect(mockEvent.prompt).toHaveBeenCalled()
      expect(result).toEqual({ outcome: 'accepted' })
    })

    it('should handle installation prompt failure', async () => {
      const error = new Error('Prompt failed')
      const mockEvent = {
        prompt: jest.fn().mockRejectedValue(error),
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await promptInstall(mockEvent as any)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to prompt install:', error)
      expect(result).toBeNull()

      consoleSpy.mockRestore()
    })

    it('should return null when no install prompt is available', async () => {
      const result = await promptInstall(null)

      expect(result).toBeNull()
    })
  })
})