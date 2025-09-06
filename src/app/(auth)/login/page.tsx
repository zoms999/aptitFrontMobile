'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, User, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

type LoginType = "personal" | "organization"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, isAuthenticated } = useAuth()

  const [loginType, setLoginType] = useState<LoginType>("personal")
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    sessionCode: '',
    rememberMe: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isCodeVerified, setIsCodeVerified] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 보안: 상대 경로만 허용, 절대 URL 차단
  const rawRedirect = searchParams.get('redirect')
  const redirectTo = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') 
    ? rawRedirect 
    : '/dashboard'

  // URL 파라미터에서 오류 메시지 확인
  useEffect(() => {
    const expired = searchParams.get('expired')
    const reason = searchParams.get('reason')

    if (expired === 'true') {
      setErrors({ general: '세션이 만료되었습니다. 다시 로그인해주세요.' })
    } else if (reason) {
      if (reason === 'account_not_found') {
        setErrors({ general: '계정 정보를 찾을 수 없습니다. 다시 로그인해주세요.' })
      } else if (reason === 'incomplete_session') {
        setErrors({ general: '로그인 정보가 불완전합니다. 다시 로그인해주세요.' })
      }
    }
  }, [searchParams])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log('인증 상태 확인됨, 리디렉션 실행:', redirectTo)
      router.push(redirectTo)
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.username) {
      newErrors.username = '아이디를 입력해주세요'
    } else if (formData.username.length < 3) {
      newErrors.username = '아이디는 3자 이상 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    }

    if (loginType === "organization" && !isCodeVerified) {
      newErrors.sessionCode = '회차코드 유효성 검사를 먼저 진행해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const verifySessionCode = async () => {
    if (!formData.sessionCode.trim()) {
      setErrors({ sessionCode: '회차코드를 입력해주세요' })
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch("/api/verify-session-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: formData.sessionCode }),
      })

      const data = await response.json()

      if (data.valid) {
        setIsCodeVerified(true)
        setErrors({})
      } else {
        setIsCodeVerified(false)
        setErrors({ sessionCode: data.message || '유효하지 않은 회차코드입니다.' })
      }
    } catch (err) {
      setErrors({ sessionCode: '회차코드 검증 중 오류가 발생했습니다.' })
      setIsCodeVerified(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      // AuthContext의 login 함수를 확장하여 loginType과 sessionCode도 처리하도록 수정 필요
      const result = await login(
        formData.username,
        formData.password,
        formData.rememberMe,
        loginType,
        loginType === "organization" ? formData.sessionCode : undefined
      )

      if (result.success) {
        console.log('로그인 성공, 리디렉션 시도:', redirectTo)
        
        // 로그인 성공 메시지 표시
        setErrors({ general: '' })
        
        // Next.js 라우터만 사용 (안전한 내부 라우팅)
        router.push(redirectTo)
      } else {
        setErrors({ general: result.error || '아이디 또는 비밀번호가 올바르지 않습니다.' })
      }
    } catch (error) {
      setErrors({ general: '로그인 중 오류가 발생했습니다.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
    // Reset code verification when session code changes
    if (field === 'sessionCode') {
      setIsCodeVerified(false)
    }
  }

  const handleLoginTypeChange = (type: LoginType) => {
    setLoginType(type)
    setErrors({})
    setIsCodeVerified(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-12 pb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            옥타그노시스에 오신 것을 환영합니다
          </h1>
          <p className="text-gray-600">
            계정에 로그인하여 적성검사를 시작하세요
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Login Type Tabs */}
            <div className="grid grid-cols-2 border-b border-gray-200">
              <button
                className={`py-4 text-center font-medium transition-colors ${loginType === "personal"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-500 hover:text-indigo-600"
                  }`}
                onClick={() => handleLoginTypeChange("personal")}
              >
                일반 로그인
              </button>
              <button
                className={`py-4 text-center font-medium transition-colors ${loginType === "organization"
                  ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
                  : "text-gray-500 hover:text-indigo-600"
                  }`}
                onClick={() => handleLoginTypeChange("organization")}
              >
                기관 로그인
              </button>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* General Error */}
                {errors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{errors.general}</p>
                  </div>
                )}

                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700 font-medium">
                    아이디
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="아이디를 입력하세요"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className={`pl-11 ${errors.username ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      autoComplete="username"
                      autoCapitalize="none"
                    />
                  </div>
                  {errors.username && (
                    <p className="text-red-500 text-sm">{errors.username}</p>
                  )}
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    비밀번호
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="비밀번호를 입력하세요"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`pl-11 pr-11 ${errors.password ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm">{errors.password}</p>
                  )}
                </div>

                {/* Session Code Field for Organization Login */}
                {loginType === "organization" && (
                  <div className="space-y-2">
                    <Label htmlFor="sessionCode" className="text-gray-700 font-medium">
                      회차코드 유효성 검사를 진행하세요
                    </Label>
                    <div className="flex space-x-3">
                      <Input
                        id="sessionCode"
                        type="text"
                        placeholder="발급받으신 코드 입력"
                        value={formData.sessionCode}
                        onChange={(e) => handleInputChange('sessionCode', e.target.value)}
                        className={`flex-1 ${isCodeVerified
                          ? "border-green-500 focus-visible:ring-green-500"
                          : errors.sessionCode
                            ? "border-red-300 focus-visible:ring-red-500"
                            : ""
                          }`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={verifySessionCode}
                        disabled={isSubmitting || !formData.sessionCode.trim()}
                        className="whitespace-nowrap px-4 py-2 text-sm"
                      >
                        유효성 확인
                      </Button>
                    </div>
                    {isCodeVerified && (
                      <p className="text-green-600 text-sm">
                        유효한 회차코드입니다.
                      </p>
                    )}
                    {errors.sessionCode && (
                      <p className="text-red-500 text-sm">{errors.sessionCode}</p>
                    )}
                  </div>
                )}

                {/* Remember Me and Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked: boolean) => handleInputChange('rememberMe', checked)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm text-gray-600 cursor-pointer">
                      로그인 상태 유지
                    </Label>
                  </div>
                  <Link
                    href="/reset-password"
                    className="text-sm text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                  >
                    비밀번호 찾기
                  </Link>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isSubmitting || (loginType === "organization" && !isCodeVerified)}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>로그인 중...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>로그인</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </form>

              {/* Auth Links */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="flex justify-center items-center space-x-4 text-sm">
                  <Link
                    href="/find-id"
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    아이디 찾기
                  </Link>
                  <span className="text-gray-300">|</span>
                  <Link
                    href={loginType === 'personal' ? '/signup/personal' : '/signup/organization'}
                    className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                  >
                    회원가입
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}