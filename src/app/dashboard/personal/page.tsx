'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigationConfig } from '@/contexts/NavigationContext'
import { User, Calendar, CheckCircle, Clock, ArrowRight, RefreshCw, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Test {
  num: number
  cr_seq: number
  cr_pay: string
  pd_kind: string
  pd_name: string
  anp_seq: number
  startdate: string
  enddate: string
  done: string
  rview: string
  expiredate: string
}

interface UserInfo {
  pe_name: string
  pe_sex: string
  pe_email: string
  pe_cellphone: string
  pe_birth_year: number
  pe_birth_month: number
  pe_birth_day: number
}

interface DashboardData {
  tests: Test[]
  completedTests: number
  userInfo: UserInfo
  isOrganization: boolean
}

export default function PersonalDashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { configureNavigation } = useNavigationConfig()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    configureNavigation({
      showNavigation: true,
      headerTitle: '개인 대시보드',
      showBackButton: false
    })
  }, [configureNavigation])

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (isAuthenticated) {
      fetchDashboardData()
    }
  }, [authLoading, isAuthenticated, router])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/personal')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '데이터를 가져오는데 실패했습니다')
      }
      
      const data = await response.json()
      
      if (data.isOrganization) {
        router.push('/dashboard/organization')
        return
      }
      
      setDashboardData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = () => {
    // TODO: Implement payment navigation
    console.log('결제 페이지로 이동')
  }

  const handleTestStart = (crSeq: number) => {
    router.push(`/test/${crSeq}`)
  }

  const handleTestContinue = (crSeq: number) => {
    router.push(`/test/${crSeq}/continue`)
  }

  const handleViewResult = (crSeq: number) => {
    router.push(`/results/${crSeq}`)
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">오류 발생</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return null
  }

  const { tests, completedTests, userInfo } = dashboardData
  const inProgressCount = tests.filter(t => t.done === 'I').length
  const readyCount = tests.filter(t => t.done === 'R').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userInfo?.pe_name || user?.name}님, 환영합니다!
              </h1>
              <p className="text-gray-600 mt-1">개인 적성검사 대시보드</p>
            </div>
            <Button onClick={handlePayment} size="sm">
              <CreditCard className="w-4 h-4 mr-2" />
              결제하기
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">완료</p>
                <p className="text-xl font-semibold text-gray-900">{completedTests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">진행중</p>
                <p className="text-xl font-semibold text-gray-900">{inProgressCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">준비됨</p>
                <p className="text-xl font-semibold text-gray-900">{readyCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            내 정보
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">이름</p>
              <p className="font-medium">{userInfo?.pe_name || '정보 없음'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">성별</p>
              <p className="font-medium">
                {userInfo?.pe_sex === 'M' ? '남성' : userInfo?.pe_sex === 'F' ? '여성' : '정보 없음'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">생년월일</p>
              <p className="font-medium">
                {userInfo?.pe_birth_year && userInfo?.pe_birth_month && userInfo?.pe_birth_day
                  ? `${userInfo.pe_birth_year}.${String(userInfo.pe_birth_month).padStart(2, '0')}.${String(userInfo.pe_birth_day).padStart(2, '0')}`
                  : '정보 없음'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">완료된 검사</p>
              <p className="font-medium">{completedTests}개</p>
            </div>
          </div>
        </div>

        {/* Tests List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">내 검사 목록</h2>
          </div>
          
          {tests.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">검사 내역이 없습니다</h3>
              <p className="text-gray-600 mb-4">새로운 검사를 시작해보세요!</p>
              <Button onClick={handlePayment}>
                새 검사 시작하기
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {tests.map((test) => (
                <div key={test.cr_seq} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{test.pd_name}</h3>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          test.pd_kind === 'basic' ? 'bg-blue-100 text-blue-800' :
                          test.pd_kind === 'premium1' ? 'bg-purple-100 text-purple-800' :
                          test.pd_kind === 'premium2' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {test.pd_kind === 'basic' ? '베이직' :
                           test.pd_kind === 'premium1' ? '프리미엄I' :
                           test.pd_kind === 'premium2' ? '프리미엄II' :
                           test.pd_kind || '미분류'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          test.cr_pay === 'Y' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {test.cr_pay === 'Y' ? '결제완료' : '미결제'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          test.done === 'R' ? 'bg-gray-100 text-gray-800' :
                          test.done === 'I' ? 'bg-yellow-100 text-yellow-800' :
                          test.done === 'E' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {test.done === 'R' ? '준비됨' :
                           test.done === 'I' ? '진행중' :
                           test.done === 'E' ? '완료' :
                           '상태없음'}
                        </span>
                      </div>
                      {test.startdate && (
                        <p className="text-xs text-gray-500 mt-1">
                          시작: {test.startdate} {test.enddate && `| 종료: ${test.enddate}`}
                        </p>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      {test.done === 'R' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleTestStart(test.cr_seq)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          시작하기
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : test.done === 'I' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleTestContinue(test.cr_seq)}
                          className="bg-yellow-600 hover:bg-yellow-700"
                        >
                          계속하기
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      ) : test.done === 'E' && (test.rview === 'Y' || test.rview === 'P') ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewResult(test.cr_seq)}
                        >
                          결과보기
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}