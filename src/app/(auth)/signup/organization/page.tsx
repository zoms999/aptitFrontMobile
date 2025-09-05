'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, User, Mail, Lock, Building, Phone, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export default function OrganizationSignupPage() {
  const router = useRouter()
  const { signup, isLoading } = useAuth()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    position: '',
    phone: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요'
    }

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요'
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    }

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = '기관명을 입력해주세요'
    }

    if (!formData.position.trim()) {
      newErrors.position = '직책을 입력해주세요'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '연락처를 입력해주세요'
    } else if (!/^[0-9-+\s()]+$/.test(formData.phone)) {
      newErrors.phone = '올바른 연락처 형식을 입력해주세요'
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = '이용약관에 동의해주세요'
    }

    if (!formData.agreePrivacy) {
      newErrors.agreePrivacy = '개인정보처리방침에 동의해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const result = await signup({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        organizationName: formData.organizationName,
        position: formData.position,
        phone: formData.phone,
        preferences: {
          language: 'ko',
          notifications: true,
          theme: 'system',
          testReminders: formData.agreeMarketing
        }
      })
      
      if (result.success) {
        router.replace('/dashboard')
      } else {
        setErrors({ general: result.error || '회원가입에 실패했습니다' })
      }
    } catch (error) {
      setErrors({ general: '네트워크 오류가 발생했습니다' })
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
  }

  const handleAllAgree = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      agreeTerms: checked,
      agreePrivacy: checked,
      agreeMarketing: checked
    }))
    setErrors(prev => ({
      ...prev,
      agreeTerms: '',
      agreePrivacy: ''
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-12 pb-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            기관 회원가입
          </h1>
          <p className="text-gray-600">
            기관용 계정으로 단체 적성검사를 관리하세요
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* General Error */}
              {errors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{errors.general}</p>
                </div>
              )}

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">개인정보</h3>
                
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">
                    이름
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="이름을 입력하세요"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className={`pl-11 ${errors.name ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      autoComplete="name"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-red-500 text-sm">{errors.name}</p>
                  )}
                </div>

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
                      placeholder="이메일을 입력하세요"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`pl-11 ${errors.email ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      autoComplete="email"
                      autoCapitalize="none"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email}</p>
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
                      placeholder="비밀번호를 입력하세요 (8자 이상)"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      className={`pl-11 pr-11 ${errors.password ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      autoComplete="new-password"
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

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                    비밀번호 확인
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="비밀번호를 다시 입력하세요"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      className={`pl-11 pr-11 ${errors.confirmPassword ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              {/* Organization Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">기관정보</h3>
                
                {/* Organization Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-gray-700 font-medium">
                    기관명
                  </Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="organizationName"
                      type="text"
                      placeholder="기관명을 입력하세요"
                      value={formData.organizationName}
                      onChange={(e) => handleInputChange('organizationName', e.target.value)}
                      className={`pl-11 ${errors.organizationName ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {errors.organizationName && (
                    <p className="text-red-500 text-sm">{errors.organizationName}</p>
                  )}
                </div>

                {/* Position Field */}
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-gray-700 font-medium">
                    직책
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="position"
                      type="text"
                      placeholder="직책을 입력하세요"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className={`pl-11 ${errors.position ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {errors.position && (
                    <p className="text-red-500 text-sm">{errors.position}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700 font-medium">
                    연락처
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="연락처를 입력하세요"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`pl-11 ${errors.phone ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-sm">{errors.phone}</p>
                  )}
                </div>
              </div>

              {/* Agreement Section */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="agreeAll"
                    checked={formData.agreeTerms && formData.agreePrivacy && formData.agreeMarketing}
                    onCheckedChange={handleAllAgree}
                  />
                  <Label htmlFor="agreeAll" className="text-sm font-medium text-gray-700 cursor-pointer">
                    전체 동의
                  </Label>
                </div>

                <div className="space-y-3 pl-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="agreeTerms"
                        checked={formData.agreeTerms}
                        onCheckedChange={(checked: boolean) => handleInputChange('agreeTerms', checked)}
                      />
                      <Label htmlFor="agreeTerms" className="text-sm text-gray-600 cursor-pointer">
                        이용약관 동의 (필수)
                      </Label>
                    </div>
                    <Link href="/terms" className="text-xs text-indigo-600 hover:text-indigo-500">
                      보기
                    </Link>
                  </div>
                  {errors.agreeTerms && (
                    <p className="text-red-500 text-xs pl-6">{errors.agreeTerms}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="agreePrivacy"
                        checked={formData.agreePrivacy}
                        onCheckedChange={(checked: boolean) => handleInputChange('agreePrivacy', checked)}
                      />
                      <Label htmlFor="agreePrivacy" className="text-sm text-gray-600 cursor-pointer">
                        개인정보처리방침 동의 (필수)
                      </Label>
                    </div>
                    <Link href="/privacy" className="text-xs text-indigo-600 hover:text-indigo-500">
                      보기
                    </Link>
                  </div>
                  {errors.agreePrivacy && (
                    <p className="text-red-500 text-xs pl-6">{errors.agreePrivacy}</p>
                  )}

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="agreeMarketing"
                      checked={formData.agreeMarketing}
                      onCheckedChange={(checked: boolean) => handleInputChange('agreeMarketing', checked)}
                    />
                    <Label htmlFor="agreeMarketing" className="text-sm text-gray-600 cursor-pointer">
                      마케팅 정보 수신 동의 (선택)
                    </Label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>가입 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>회원가입</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600">
                이미 계정이 있으신가요?{' '}
                <Link
                  href="/login"
                  className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
                >
                  로그인
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}