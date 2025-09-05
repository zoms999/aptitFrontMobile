'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePWA } from '@/components/PWAProvider'
import { PWAInstallButton } from '@/components/PWAInstallPrompt'
import { OfflineBadge, ConnectionStatus } from '@/components/OfflineIndicator'
import { useNavigationConfig } from '@/contexts/NavigationContext'
import { useAuth } from '@/contexts/AuthContext'
import { Smartphone, Wifi, Download } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()
  const { isInstalled, isSupported, isOnline } = usePWA()
  const { configureNavigation } = useNavigationConfig()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    configureNavigation({
      showNavigation: false,
      headerTitle: 'Aptit',
      showBackButton: false
    })
  }, [configureNavigation])

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-full">
      <div className="text-center space-y-6 max-w-md">
        {/* PWA Status Indicators */}
        <div className="flex justify-center space-x-2 mb-4">
          <OfflineBadge />
          {isInstalled && (
            <div className="inline-flex items-center space-x-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full border border-green-200">
              <Smartphone className="w-3 h-3" />
              <span>앱 설치됨</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Aptit Mobile
          </h1>
          <p className="text-lg text-gray-600">
            모바일 환경에 최적화된 적성검사 애플리케이션
          </p>
        </div>

        {/* PWA Features */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Smartphone className="w-4 h-4 mr-2" />
            PWA 기능
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isSupported ? 'bg-green-500' : 'bg-red-500'}`} />
              PWA 지원: {isSupported ? '지원됨' : '지원되지 않음'}
            </li>
            <li className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isInstalled ? 'bg-green-500' : 'bg-yellow-500'}`} />
              설치 상태: {isInstalled ? '설치됨' : '미설치'}
            </li>
            <li className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              연결 상태: {isOnline ? '온라인' : '오프라인'}
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <Link 
            href="/login"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium min-touch-target touch-manipulation haptic-light hover:bg-blue-700 transition-colors text-center"
          >
            로그인
          </Link>
          
          <Link 
            href="/signup"
            className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium min-touch-target touch-manipulation haptic-light hover:bg-gray-50 transition-colors text-center"
          >
            회원가입
          </Link>

          {/* PWA Install Button */}
          <PWAInstallButton className="w-full" />
        </div>

        {/* Connection Status */}
        <div className="pt-4">
          <ConnectionStatus className="justify-center" />
        </div>

        {/* PWA Info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>이 앱은 Progressive Web App (PWA)입니다</p>
          <p>오프라인에서도 사용할 수 있으며, 홈 화면에 설치 가능합니다</p>
        </div>
      </div>
    </div>
  )
}