'use client'

import { useEffect } from 'react'
import { useNavigationConfig } from '@/contexts/NavigationContext'

export default function ResultsPage() {
  const { configureNavigation } = useNavigationConfig()

  useEffect(() => {
    configureNavigation({
      showNavigation: true,
      headerTitle: '결과',
      showBackButton: false
    })
  }, [configureNavigation])

  return (
    <div className="p-4 space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          테스트 결과
        </h2>
        
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 완료한 테스트가 없습니다
          </h3>
          <p className="text-gray-600 mb-6">
            테스트를 완료하면 여기에서 결과를 확인할 수 있습니다.
          </p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium">
            첫 테스트 시작하기
          </button>
        </div>
      </div>
    </div>
  )
}