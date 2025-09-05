'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function FindIdPage() {
  const router = useRouter()
  
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [foundId, setFoundId] = useState('')
  const [error, setError] = useState('')

  const validateEmail = () => {
    if (!email) {
      setError('이메일을 입력해주세요')
      return false
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('올바른 이메일 형식을 입력해주세요')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateEmail()) return

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/find-id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setFoundId(data.username)
        setIsSuccess(true)
      } else {
        setError(data.error || '해당 이메일로 등록된 계정을 찾을 수 없습니다')
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (value: string) => {
    setEmail(value)
    if (error) {
      setError('')
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-12 pb-8">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              아이디 찾기 완료
            </h1>
            <p className="text-gray-600">
              입력하신 이메일로 등록된 아이디를 찾았습니다
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 pb-6">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <p className="text-sm text-gray-600 mb-2">찾은 아이디</p>
                  <p className="text-2xl font-bold text-green-700">{foundId}</p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full h-12 text-base font-semibold"
                  >
                    <div className="flex items-center space-x-2">
                      <span>로그인하기</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push('/reset-password')}
                    className="w-full h-12 text-base font-semibold"
                  >
                    비밀번호 재설정
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-12 pb-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            아이디 찾기
          </h1>
          <p className="text-gray-600">
            가입 시 사용한 이메일을 입력해주세요
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  이메일
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="가입 시 사용한 이메일을 입력하세요"
                    value={email}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className={`pl-11 ${error ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                    autoComplete="email"
                    autoCapitalize="none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>찾는 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>아이디 찾기</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-center items-center space-x-4 text-sm">
                <Link
                  href="/reset-password"
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  비밀번호 찾기
                </Link>
                <span className="text-gray-300">|</span>
                <Link
                  href="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                >
                  로그인
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}