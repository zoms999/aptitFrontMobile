'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigationConfig } from '@/contexts/NavigationContext'
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Clock, 
  Calendar,
  ArrowRight, 
  RefreshCw, 
  CreditCard,
  User,
  Mail,
  Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AccountStatus {
  cr_pay: string
  pd_kind: string
  expire: string
  state: string
}

interface Test {
  num: number
  cr_seq: number
  cr_pay: string
  pd_name: string
  anp_seq: number
  startdate: string
  enddate: string
  done: string
  rview: string
  expiredate: string
}

interface InstituteInfo {
  ins_seq: string
  ins_name: string
  tur_seq: string
  tur_code: string
  tur_req_sum: string
  tur_use_sum: string
  tur_is_paid: string
  tur_allow_no_payment: string
}

interface Member {
  pe_seq: string
  pe_name: string
  pe_email: string
  pe_sex: string
  pe_cellphone: string
  join_date: string
  ac_gid: string | null
  ac_id: string | null
  testStatus: {
    hasTest: boolean
    testCount: number
    completedCount: number
    latestTestStatus: string
    latestCrSeq: string | null
  }
}

interface DashboardData {
  accountStatus: AccountStatus
  tests: Test[]
  completedTests: number
  instituteInfo: InstituteInfo
  members: Member[]
  isOrganization: boolean
  isOrganizationAdmin: boolean
  userType: string
}

export default function OrganizationDashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { configureNavigation } = useNavigationConfig()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    configureNavigation({
      showNavigation: true,
      headerTitle: '기관 대시보드',
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
      const response = await fetch('/api/dashboard/organization')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '데이터를 가져오는데 실패했습니다')
      }
      
      const data = await response.json()
      
      if (!data.isOrganization) {
        router.push('/dashboard/personal')
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
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

  const { accountStatus, tests, completedTests, instituteInfo, members, isOrganizationAdmin } = dashboardData
  const inProgressCount = tests.filter(t => t.done === 'I').length
  const readyCount = tests.filter(t => t.done === 'R').length
  const isExpired = accountStatus.expire === 'N'
  const isInstitutePaid = instituteInfo?.tur_is_paid === 'Y'
  const allowNoPayment = instituteInfo?.tur_allow_no_payment === 'Y'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {instituteInfo?.ins_name || '기관명'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isOrganizationAdmin ? '기관 관리자' : '기관 회원'} 대시보드
              </p>
            </div>
            {isOrganizationAdmin && (
              <Button onClick={handlePayment} size="sm">
                <CreditCard className="w-4 h-4 mr-2" />
                결제하기
              </Button>
            )}
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

        {/* Institute Info */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            기관 정보
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">기관명</p>
              <p className="font-medium">{instituteInfo?.ins_name || '정보 없음'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">회차코드</p>
              <p className="font-medium">{instituteInfo?.tur_code || '정보 없음'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">요청 인원</p>
              <p className="font-medium">{instituteInfo?.tur_req_sum || '0'}명</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">사용 인원</p>
              <p className="font-medium">{instituteInfo?.tur_use_sum || '0'}명</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">결제 상태</p>
              <p className={`font-medium ${isInstitutePaid ? 'text-green-600' : 'text-red-600'}`}>
                {isInstitutePaid ? '결제완료' : '미결제'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">무료 허용</p>
              <p className={`font-medium ${allowNoPayment ? 'text-green-600' : 'text-gray-600'}`}>
                {allowNoPayment ? '허용' : '불허용'}
              </p>
            </div>
          </div>
        </div>

        {/* Members List (Admin Only) */}
        {isOrganizationAdmin && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                기관 회원 목록 ({members.length}명)
              </h2>
            </div>
            
            {members.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-4">
                  <Users className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 회원이 없습니다</h3>
                <p className="text-gray-600">회원을 등록해주세요.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.pe_seq} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-full mr-3">
                            <User className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{member.pe_name}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {member.pe_email}
                              </span>
                              {member.pe_cellphone && (
                                <span className="flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {member.pe_cellphone}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                member.pe_sex === 'M' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                              }`}>
                                {member.pe_sex === 'M' ? '남성' : '여성'}
                              </span>
                              <span className="text-xs text-gray-500">
                                가입일: {member.join_date}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 text-right">
                        {member.testStatus.hasTest ? (
                          <div className="text-sm">
                            <p className="font-medium text-gray-900">
                              {member.testStatus.completedCount}/{member.testStatus.testCount} 완료
                            </p>
                            <p className={`text-xs ${
                              member.testStatus.latestTestStatus === 'E' ? 'text-green-600' :
                              member.testStatus.latestTestStatus === 'I' ? 'text-yellow-600' :
                              'text-gray-600'
                            }`}>
                              {member.testStatus.latestTestStatus === 'E' ? '완료' :
                               member.testStatus.latestTestStatus === 'I' ? '진행중' :
                               '준비됨'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">검사 없음</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
              {isOrganizationAdmin && (
                <Button onClick={handlePayment}>
                  새 검사 시작하기
                </Button>
              )}
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