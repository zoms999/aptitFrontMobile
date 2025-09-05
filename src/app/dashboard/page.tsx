'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  useEffect(() => {
    console.log('대시보드 페이지 로드됨', { isAuthenticated, authLoading, user })

    if (!authLoading) {
      if (!isAuthenticated) {
        console.log('인증되지 않음, 로그인 페이지로 이동')
        router.push('/login')
        return
      }
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">로딩 중...</h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            대시보드
          </h1>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-green-900 mb-2">
              🎉 로그인 성공!
            </h2>
            <p className="text-green-700 mb-4">
              환영합니다, <strong>{user?.name}</strong>님!
            </p>
            <p className="text-sm text-green-600">
              로그인이 성공적으로 완료되었습니다. 대시보드에 오신 것을 환영합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">사용자 정보</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">이름:</span> {user?.name}</p>
                <p><span className="font-medium">이메일:</span> {user?.email}</p>
                <p><span className="font-medium">타입:</span> {user?.type}</p>
                <p><span className="font-medium">ID:</span> {user?.ac_id}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">빠른 액션</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => router.push('/dashboard/personal')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  개인 대시보드
                </button>
                <button 
                  onClick={() => router.push('/dashboard/organization')}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  기관 대시보드
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">시스템 상태</h3>
              <div className="space-y-2">
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">서버 연결됨</span>
                </div>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">인증 완료</span>
                </div>
                <div className="flex items-center text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm">대시보드 로드됨</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">디버그 정보</h3>
            <pre className="text-xs text-gray-600 overflow-auto">
              {JSON.stringify({ 
                isAuthenticated, 
                authLoading, 
                userType: user?.type,
                userName: user?.name,
                timestamp: new Date().toISOString()
              }, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}