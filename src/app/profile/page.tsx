'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNavigationConfig } from '@/contexts/NavigationContext'
import { useAuth } from '@/contexts/AuthContext'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { PasswordChangeForm } from '@/components/profile/PasswordChangeForm'
import { AccountDeletionForm } from '@/components/profile/AccountDeletionForm'
import { SettingsModal } from '@/components/profile/SettingsModal'

type ModalType = 'profile' | 'password' | 'settings' | 'delete' | null

export default function ProfilePage() {
  const router = useRouter()
  const { configureNavigation } = useNavigationConfig()
  const { user, logout } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalType>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    configureNavigation({
      showNavigation: true,
      headerTitle: '프로필',
      showBackButton: false
    })
  }, [configureNavigation])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      router.replace('/')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleModalClose = () => {
    setActiveModal(null)
  }

  const handleSuccess = (message: string) => {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  return (
    <div className="p-4 space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <div className="bg-white rounded-lg p-6 shadow-sm">
        {/* Profile Header */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.name || '사용자'}</h2>
            <p className="text-gray-600">{user?.email || 'user@example.com'}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Account Settings */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">계정 설정</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModal('profile')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">개인정보 수정</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
              
              <button 
                onClick={() => setActiveModal('password')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">비밀번호 변경</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
              
              <button 
                onClick={() => setActiveModal('settings')}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">설정 및 환경설정</span>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-red-600 mb-3">위험 구역</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveModal('delete')}
                className="w-full text-left p-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
              >
                <div className="flex justify-between items-center">
                  <span>계정 삭제</span>
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-200 pt-4">
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full text-left p-3 rounded-lg hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50"
            >
              {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === 'profile' && (
        <ProfileEditForm
          onClose={handleModalClose}
          onSuccess={() => handleSuccess('프로필이 성공적으로 업데이트되었습니다.')}
        />
      )}

      {activeModal === 'password' && (
        <PasswordChangeForm
          onClose={handleModalClose}
          onSuccess={() => handleSuccess('비밀번호가 성공적으로 변경되었습니다.')}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          onClose={handleModalClose}
          onSuccess={() => handleSuccess('설정이 성공적으로 저장되었습니다.')}
        />
      )}

      {activeModal === 'delete' && (
        <AccountDeletionForm
          onClose={handleModalClose}
        />
      )}
    </div>
  )
}