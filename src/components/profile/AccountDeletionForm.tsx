'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface AccountDeletionFormProps {
  onClose: () => void
}

export function AccountDeletionForm({ onClose }: AccountDeletionFormProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'warning' | 'confirmation' | 'password'>('warning')
  
  const [formData, setFormData] = useState({
    password: '',
    confirmText: '',
    dataExport: false,
    confirmDeletion: false
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError(null)
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }))
  }

  const handleDataExport = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/profile/export-data', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `aptit-data-${user?.email}-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setFormData(prev => ({ ...prev, dataExport: true }))
      } else {
        const data = await response.json()
        setError(data.error || '데이터 내보내기에 실패했습니다.')
      }
    } catch (error) {
      console.error('Data export error:', error)
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const validatePasswordStep = () => {
    if (!formData.password) {
      setError('비밀번호를 입력해주세요.')
      return false
    }
    
    if (formData.confirmText !== 'DELETE') {
      setError('확인 텍스트를 정확히 입력해주세요.')
      return false
    }
    
    if (!formData.confirmDeletion) {
      setError('계정 삭제에 동의해주세요.')
      return false
    }
    
    return true
  }

  const handleDeleteAccount = async () => {
    if (!validatePasswordStep()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/profile/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          password: formData.password,
          confirmText: formData.confirmText
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        await logout()
        router.replace('/')
      } else {
        setError(data.error || '계정 삭제에 실패했습니다.')
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderWarningStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-600 mb-2">계정 삭제 경고</h3>
        <p className="text-gray-600 text-sm">
          계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-800 mb-2">삭제될 데이터:</h4>
        <ul className="text-sm text-red-700 space-y-1">
          <li>• 개인 프로필 정보</li>
          <li>• 모든 테스트 결과 및 분석</li>
          <li>• 설정 및 환경설정</li>
          <li>• 계정 연결 정보</li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            id="dataExport"
            checked={formData.dataExport}
            onCheckedChange={(checked) => handleCheckboxChange('dataExport', checked as boolean)}
          />
          <div className="flex-1">
            <Label htmlFor="dataExport" className="text-sm">
              데이터 내보내기 (권장)
            </Label>
            <p className="text-xs text-gray-500 mt-1">
              계정 삭제 전에 개인 데이터를 다운로드합니다.
            </p>
          </div>
        </div>

        {!formData.dataExport && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDataExport}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? '내보내는 중...' : '데이터 내보내기'}
          </Button>
        )}
      </div>

      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1"
        >
          취소
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setStep('confirmation')}
          className="flex-1"
        >
          계속 진행
        </Button>
      </div>
    </div>
  )

  const renderConfirmationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">최종 확인</h3>
        <p className="text-gray-600 text-sm">
          정말로 계정을 삭제하시겠습니까?
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>주의:</strong> 이 작업은 되돌릴 수 없습니다. 
          계정과 모든 관련 데이터가 영구적으로 삭제됩니다.
        </p>
      </div>

      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('warning')}
          className="flex-1"
        >
          이전
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setStep('password')}
          className="flex-1"
        >
          삭제 진행
        </Button>
      </div>
    </div>
  )

  const renderPasswordStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">계정 삭제 인증</h3>
        <p className="text-gray-600 text-sm">
          계정 삭제를 위해 비밀번호와 확인 텍스트를 입력해주세요.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="password">비밀번호</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="현재 비밀번호를 입력하세요"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="confirmText">
            확인 텍스트 (정확히 "DELETE"를 입력하세요)
          </Label>
          <Input
            id="confirmText"
            name="confirmText"
            type="text"
            value={formData.confirmText}
            onChange={handleInputChange}
            placeholder="DELETE"
            className="mt-1"
          />
        </div>

        <div className="flex items-start space-x-3">
          <Checkbox
            id="confirmDeletion"
            checked={formData.confirmDeletion}
            onCheckedChange={(checked) => handleCheckboxChange('confirmDeletion', checked as boolean)}
          />
          <Label htmlFor="confirmDeletion" className="text-sm">
            위의 내용을 모두 이해했으며, 계정 삭제에 동의합니다.
          </Label>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep('confirmation')}
          className="flex-1"
          disabled={isLoading}
        >
          이전
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDeleteAccount}
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading ? '삭제 중...' : '계정 삭제'}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-red-600">계정 삭제</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {step === 'warning' && renderWarningStep()}
          {step === 'confirmation' && renderConfirmationStep()}
          {step === 'password' && renderPasswordStep()}
        </div>
      </Card>
    </div>
  )
}