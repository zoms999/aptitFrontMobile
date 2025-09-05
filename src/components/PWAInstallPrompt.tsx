'use client'

import { useState, useEffect } from 'react'
import { useInstallPrompt } from './PWAProvider'
import { X, Download, Smartphone } from 'lucide-react'

interface PWAInstallPromptProps {
  className?: string
}

export function PWAInstallPrompt({ className = '' }: PWAInstallPromptProps) {
  const { canInstall, install, isInstalled, showPrompt } = useInstallPrompt()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isInstalling, setIsInstalling] = useState(false)

  // Check if user has previously dismissed the prompt
  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (dismissed) {
      const dismissedDate = new Date(dismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      
      // Show prompt again after 7 days
      if (daysSinceDismissed < 7) {
        setIsDismissed(true)
      }
    }
  }, [])

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const success = await install()
      if (success) {
        setIsDismissed(true)
      }
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
  }

  // Don't show if not installable, already installed, or dismissed
  if (!showPrompt || isInstalled || isDismissed) {
    return null
  }

  return (
    <div className={`
      fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm
      bg-gradient-to-r from-blue-600 to-blue-700 text-white
      rounded-xl shadow-lg border border-blue-500/20
      animate-slide-up
      ${className}
    `}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">앱으로 설치하기</h3>
              <p className="text-xs text-blue-100 mt-1">
                홈 화면에서 빠르게 접근하세요
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white transition-colors p-1"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="
              flex-1 bg-white text-blue-600 font-medium text-sm py-2.5 px-4 rounded-lg
              hover:bg-blue-50 transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center space-x-2
            "
          >
            {isInstalling ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>설치 중...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>설치</span>
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            className="
              px-4 py-2.5 text-sm text-blue-200 hover:text-white transition-colors
              border border-blue-400/30 rounded-lg hover:border-blue-300/50
            "
          >
            나중에
          </button>
        </div>
      </div>
      
      {/* Features list */}
      <div className="px-4 pb-4">
        <div className="text-xs text-blue-100 space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 bg-blue-300 rounded-full" />
            <span>오프라인에서도 사용 가능</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 bg-blue-300 rounded-full" />
            <span>빠른 로딩 속도</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 bg-blue-300 rounded-full" />
            <span>푸시 알림 지원</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact version for header/navigation
export function PWAInstallButton({ className = '' }: PWAInstallPromptProps) {
  const { canInstall, install, isInstalled } = useInstallPrompt()
  const [isInstalling, setIsInstalling] = useState(false)

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await install()
    } catch (error) {
      console.error('Installation failed:', error)
    } finally {
      setIsInstalling(false)
    }
  }

  if (!canInstall || isInstalled) {
    return null
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className={`
        inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium
        bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {isInstalling ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>설치 중...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>앱 설치</span>
        </>
      )}
    </button>
  )
}