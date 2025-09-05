'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'

type Language = 'ko' | 'en'

interface LocalizationContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string) => string
}

// Simple translation dictionary
const translations = {
  ko: {
    // Profile page
    'profile.title': '프로필',
    'profile.editProfile': '개인정보 수정',
    'profile.changePassword': '비밀번호 변경',
    'profile.settings': '설정 및 환경설정',
    'profile.deleteAccount': '계정 삭제',
    'profile.logout': '로그아웃',
    'profile.dangerZone': '위험 구역',
    
    // Settings
    'settings.title': '설정',
    'settings.language': '언어 설정',
    'settings.theme': '테마 설정',
    'settings.notifications': '알림 설정',
    'settings.mobile': '모바일 설정',
    'settings.save': '설정 저장',
    'settings.saving': '저장 중...',
    'settings.saved': '설정이 성공적으로 저장되었습니다.',
    
    // Theme options
    'theme.light': '라이트 모드',
    'theme.dark': '다크 모드',
    'theme.system': '시스템 설정 따르기',
    
    // Language options
    'language.korean': '한국어',
    'language.english': 'English',
    
    // Notification settings
    'notifications.push': '푸시 알림',
    'notifications.pushDesc': '새로운 테스트 및 결과 알림',
    'notifications.reminders': '테스트 리마인더',
    'notifications.remindersDesc': '정기적인 테스트 참여 알림',
    
    // Mobile settings
    'mobile.haptic': '햅틱 피드백',
    'mobile.hapticDesc': '터치 시 진동 피드백',
    'mobile.autoSave': '자동 저장',
    'mobile.autoSaveDesc': '테스트 진행 중 자동 저장',
    
    // Common
    'common.cancel': '취소',
    'common.save': '저장',
    'common.close': '닫기',
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다.',
    'common.success': '성공적으로 완료되었습니다.'
  },
  en: {
    // Profile page
    'profile.title': 'Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.changePassword': 'Change Password',
    'profile.settings': 'Settings & Preferences',
    'profile.deleteAccount': 'Delete Account',
    'profile.logout': 'Logout',
    'profile.dangerZone': 'Danger Zone',
    
    // Settings
    'settings.title': 'Settings',
    'settings.language': 'Language Settings',
    'settings.theme': 'Theme Settings',
    'settings.notifications': 'Notification Settings',
    'settings.mobile': 'Mobile Settings',
    'settings.save': 'Save Settings',
    'settings.saving': 'Saving...',
    'settings.saved': 'Settings saved successfully.',
    
    // Theme options
    'theme.light': 'Light Mode',
    'theme.dark': 'Dark Mode',
    'theme.system': 'Follow System',
    
    // Language options
    'language.korean': '한국어',
    'language.english': 'English',
    
    // Notification settings
    'notifications.push': 'Push Notifications',
    'notifications.pushDesc': 'New test and result notifications',
    'notifications.reminders': 'Test Reminders',
    'notifications.remindersDesc': 'Regular test participation reminders',
    
    // Mobile settings
    'mobile.haptic': 'Haptic Feedback',
    'mobile.hapticDesc': 'Vibration feedback on touch',
    'mobile.autoSave': 'Auto Save',
    'mobile.autoSaveDesc': 'Automatically save during tests',
    
    // Common
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred.',
    'common.success': 'Completed successfully.'
  }
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined)

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [language, setLanguageState] = useState<Language>('ko')

  // Initialize language from user preferences
  useEffect(() => {
    if (user?.preferences?.language) {
      setLanguageState(user.preferences.language)
    } else {
      // Check localStorage for language preference
      const savedLanguage = localStorage.getItem('language') as Language
      if (savedLanguage && ['ko', 'en'].includes(savedLanguage)) {
        setLanguageState(savedLanguage)
      } else {
        // Detect browser language
        const browserLanguage = navigator.language.toLowerCase()
        if (browserLanguage.startsWith('ko')) {
          setLanguageState('ko')
        } else {
          setLanguageState('en')
        }
      }
    }
  }, [user])

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage)
    localStorage.setItem('language', newLanguage)
    
    // Update document language
    document.documentElement.lang = newLanguage
  }

  const t = (key: string): string => {
    const translation = translations[language]?.[key as keyof typeof translations[typeof language]]
    return translation || key
  }

  const value: LocalizationContextType = {
    language,
    setLanguage,
    t
  }

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}

export function useLocalization() {
  const context = useContext(LocalizationContext)
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider')
  }
  return context
}