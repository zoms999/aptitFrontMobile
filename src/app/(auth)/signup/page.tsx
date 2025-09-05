"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // URL 파라미터에서 타입 확인 (type=personal 또는 type=organization)
    const type = searchParams.get('type') || 'personal';
    
    // 적절한 페이지로 리다이렉트
    if (type === 'organization') {
      router.replace('/signup/organization');
    } else {
      router.replace('/signup/personal');
    }
  }, [router, searchParams]);

  // 리다이렉트 중임을 표시하는 로딩 화면
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        <h1 className="text-2xl font-bold text-gray-800 mt-4">회원가입 페이지로 이동 중...</h1>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <h1 className="text-2xl font-bold text-gray-800 mt-4">로딩 중...</h1>
        </div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}