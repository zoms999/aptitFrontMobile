'use client'

import { useEffect } from 'react'
import { useNavigationConfig } from '@/contexts/NavigationContext'

export default function TestPage() {
  const { configureNavigation } = useNavigationConfig()

  useEffect(() => {
    configureNavigation({
      showNavigation: true,
      headerTitle: '테스트',
      showBackButton: false
    })
  }, [configureNavigation])

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          사용 가능한 테스트
        </h2>
        
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">기본 적성검사</h3>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                사용 가능
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              기본적인 적성을 평가하는 테스트입니다. 약 30분 소요됩니다.
            </p>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                문항 수: 50개 | 시간: 30분
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
                시작하기
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 opacity-60">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-gray-900">고급 적성검사</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                준비 중
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              심화된 적성을 평가하는 테스트입니다. 약 60분 소요됩니다.
            </p>
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                문항 수: 100개 | 시간: 60분
              </div>
              <button 
                disabled 
                className="bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                준비 중
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}