"use client";

import { useState } from 'react';
import DaumPostcode from 'react-daum-postcode';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// 폼 데이터 타입 정의
interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  gender: string;
  birthdate: string;
  phone: string;
  additionalPhone: string;
  email: string;
  zipcode: string;
  roadAddress: string;
  jibunAddress: string;
  detailAddress: string;
  additionalAddress: string;
  academicGroup: string;
  schoolName: string;
  major: string;
  grade: string;
  jobGroup: string;
  companyName: string;
  jobDescription: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
  sessionCode: string;
  instituteSeq: string;
  turnSeq: string;
}

// 에러 타입 정의
interface FormErrors {
  username?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  gender?: string;
  birthdate?: string;
  phone?: string;
  email?: string;
  zipcode?: string;
  academicGroup?: string;
  jobGroup?: string;
  agreeTerms?: string;
  agreePrivacy?: string;
  sessionCode?: string;
}

// 학업군 타입 정의
interface Group {
  value: string;
  label: string;
}

const OrganizationSignupForm = () => {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    gender: '',
    birthdate: '',
    phone: '',
    additionalPhone: '',
    email: '',
    zipcode: '',
    roadAddress: '',
    jibunAddress: '',
    detailAddress: '',
    additionalAddress: '',
    academicGroup: '',
    schoolName: '',
    major: '',
    grade: '',
    jobGroup: '',
    companyName: '',
    jobDescription: '',
    agreeTerms: false,
    agreePrivacy: false,
    agreeMarketing: false,
    sessionCode: '',
    instituteSeq: '',
    turnSeq: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPostcode, setShowPostcode] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameCheckMessage, setUsernameCheckMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeCheckMessage, setCodeCheckMessage] = useState('');

  // 데이터 목록
  const academicGroups: Group[] = [
    { value: 'URE0001', label: '초등학교' },
    { value: 'URE0002', label: '중학교' },
    { value: 'URE0003', label: '고등학교' },
    { value: 'URE0004', label: '고등학교 졸업' },
    { value: 'URE0005', label: '대학 재학중' },
    { value: 'URE0006', label: '대학 중퇴' },
    { value: 'URE0007', label: '대학 수료' },
    { value: 'URE0008', label: '대학 졸업' },
    { value: 'URE0009', label: '대학교 재학중' },
    { value: 'URE0010', label: '대학교 중퇴' },
    { value: 'URE0011', label: '대학교 수료' },
    { value: 'URE0012', label: '대학교 졸업' },
    { value: 'URE0013', label: '대학원 재학' },
    { value: 'URE0014', label: '대학원 중퇴' },
    { value: 'URE0015', label: '대학원 수료' },
    { value: 'URE0016', label: '석사' },
    { value: 'URE0017', label: '박사' }
  ];
  
  const jobGroups: Group[] = [
    { value: 'URJ0001', label: '학생' },
    { value: 'URJ0002', label: '회사원' },
    { value: 'URJ0003', label: '전문직' },
    { value: 'URJ0004', label: '사업가' },
    { value: 'URJ0005', label: '공무원' },
    { value: 'URJ0006', label: '무직' },
    { value: 'URJ0007', label: '기타' }
  ];
  
  const grades: string[] = ['1학년', '2학년', '3학년', '4학년', '5학년', '6학년', '졸업'];

  // 카카오 주소 검색 완료 핸들러
  const handlePostcodeComplete = (data: { zonecode: string; roadAddress: string; jibunAddress?: string; autoJibunAddress?: string }) => {
    setFormData(prev => ({
      ...prev,
      zipcode: data.zonecode,
      roadAddress: data.roadAddress,
      jibunAddress: data.jibunAddress || data.autoJibunAddress || ''
    }));
    setShowPostcode(false);
    toast.success('주소가 입력되었습니다', {
      position: "top-center",
      autoClose: 2000,
    });
  };

  // 기관 코드 검증 함수
  const verifySessionCode = async () => {
    if (!formData.sessionCode.trim()) {
      setCodeCheckMessage('회차코드를 입력해주세요.');
      setCodeVerified(false);
      toast.error('회차코드를 입력해주세요', {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }

    try {
      const loadingToast = toast.loading('회차코드 확인 중...', {
        position: "top-center"
      });

      const response = await fetch('/api/verify-session-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: formData.sessionCode }),
      });

      toast.dismiss(loadingToast);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.valid) {
        toast.success('유효한 회차코드입니다', {
          position: "top-center",
          autoClose: 2000,
        });
        setCodeCheckMessage(`${data.instituteName} - 유효한 회차코드입니다.`);
        setCodeVerified(true);
        setFormData(prev => ({
          ...prev,
          instituteSeq: data.instituteSeq,
          turnSeq: data.turnSeq
        }));
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('institute_seq', data.instituteSeq);
          localStorage.setItem('turn_seq', data.turnSeq);
          localStorage.setItem('institute_name', data.instituteName);
        }
        
        setErrors(prev => ({ ...prev, sessionCode: undefined }));
      } else {
        toast.error('소속기관을 확인할 수 없는 회차코드입니다', {
          position: "top-center", 
          autoClose: 3000,
        });
        setCodeCheckMessage('소속기관 미확인');
        setCodeVerified(false);
        setErrors(prev => ({ ...prev, sessionCode: '유효하지 않은 회차코드입니다.' }));
      }
    } catch (error) {
      const errorMessage = error as Error;
      toast.error(`확인 중 오류 발생: ${errorMessage.message || '알 수 없는 오류'}`, {
        position: "top-center",
        autoClose: 3000,
      });
      setCodeCheckMessage(`회차코드 확인 중 오류가 발생했습니다`);
      setCodeVerified(false);
      setErrors(prev => ({ ...prev, sessionCode: '회차코드 확인 중 오류가 발생했습니다.' }));
    }
  };

  // 아이디 중복 검사
  const checkUsername = async () => {
    if (!formData.username) {
      toast.error('아이디를 입력해주세요', {
        position: "top-center",
        autoClose: 3000,
      });
      setUsernameCheckMessage('아이디를 입력해주세요.');
      setUsernameChecked(false);
      return;
    }

    if (formData.username.length < 6 || !/^[a-zA-Z0-9]+$/.test(formData.username)) {
      toast.error('아이디는 6자 이상, 영문과 숫자만 사용 가능합니다', {
        position: "top-center",
        autoClose: 3000,
      });
      setUsernameCheckMessage('아이디는 6자 이상, 영문과 숫자만 사용 가능합니다.');
      setUsernameChecked(false);
      return;
    }

    try {
      const loadingToast = toast.loading('아이디 확인 중...', {
        position: "top-center"
      });

      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: formData.username.toLowerCase() }),
      });

      toast.dismiss(loadingToast);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.available) {
        toast.success('사용 가능한 아이디입니다', {
          position: "top-center",
          autoClose: 2000,
        });
        setUsernameCheckMessage('사용 가능한 아이디입니다.');
        setUsernameChecked(true);
      } else {
        toast.error('이미 사용 중인 아이디입니다', {
          position: "top-center", 
          autoClose: 3000,
        });
        setUsernameCheckMessage('이미 사용 중인 아이디입니다.');
        setUsernameChecked(false);
      }
    } catch (error) {
      const errorMessage = error as Error;
      toast.error(`확인 중 오류 발생: ${errorMessage.message || '알 수 없는 오류'}`, {
        position: "top-center",
        autoClose: 3000,
      });
      setUsernameCheckMessage(`아이디 확인 중 오류가 발생했습니다`);
      setUsernameChecked(false);
    }
  };

  // 입력 필드 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 진행 상태 표시 컴포넌트
  const ProgressBar = () => {
    const steps = ['기관 확인', '기본 정보', '주소 정보', '학업/직업 정보', '약관 동의'];
    return (
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`text-xs font-medium ${
                index + 1 <= currentStep ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    );
  };

  // 다음 단계로 이동 함수
  const nextStep = () => {
    let canProceed = true;
    const newErrors: FormErrors = {};
    
    if (currentStep === 1) {
      if (!codeVerified) {
        newErrors.sessionCode = '기관 회차코드 확인이 필요합니다.';
        canProceed = false;
      }
    } else if (currentStep === 2) {
      if (!usernameChecked) {
        newErrors.username = '아이디 중복 확인을 해주세요.';
        canProceed = false;
      }
      if (formData.password.length < 6 || !/^[a-zA-Z0-9]+$/.test(formData.password)) {
        newErrors.password = '비밀번호는 6자 이상, 영문과 숫자만 사용 가능합니다.';
        canProceed = false;
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
        canProceed = false;
      }
      if (!formData.name.trim()) {
        newErrors.name = '이름을 입력해주세요.';
        canProceed = false;
      }
      if (!formData.gender) {
        newErrors.gender = '성별을 선택해주세요.';
        canProceed = false;
      }
      if (!formData.birthdate) {
        newErrors.birthdate = '생년월일을 입력해주세요.';
        canProceed = false;
      }
      if (!formData.phone || !/^\d+$/.test(formData.phone)) {
        newErrors.phone = '휴대전화는 숫자만 입력 가능합니다.';
        canProceed = false;
      }
      if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = '유효한 이메일 주소를 입력해주세요.';
        canProceed = false;
      }
    } else if (currentStep === 3) {
      if (!formData.zipcode || !formData.roadAddress) {
        newErrors.zipcode = '주소를 입력해주세요.';
        canProceed = false;
      }
    } else if (currentStep === 4) {
      if (!formData.academicGroup) {
        newErrors.academicGroup = '학업군을 선택해주세요.';
        canProceed = false;
      }
      if (!formData.jobGroup) {
        newErrors.jobGroup = '직업군을 선택해주세요.';
        canProceed = false;
      }
    }
    
    setErrors(newErrors);
    
    if (canProceed) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.success('다음 단계로 이동합니다', {
        position: "top-center",
        autoClose: 1500,
      });
    } else {
      toast.error('필수 정보를 모두 입력해주세요', {
        position: "top-center",
        autoClose: 3000,
      });
    }
  };
  
  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Enter 키 입력 시 폼 자동 제출 방지
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep < 5) {
        toast.info('각 단계별로 다음 버튼을 클릭하여 진행해주세요', {
          position: "top-center",
          autoClose: 2000,
        });
      } else {
        toast.info('가입하기 버튼을 클릭하여 가입을 진행해주세요', {
          position: "top-center",
          autoClose: 2000,
        });
      }
    }
  };
  
  // '가입하기' 버튼 클릭 시 실행될 함수
  const handleSignup = async () => {
    if (currentStep !== 5) {
      toast.error('모든 단계를 완료 후 가입하기 버튼을 클릭해주세요', {
        position: "top-center",
        autoClose: 3000,
      });
      return;
    }
    
    if (!formData.agreeTerms || !formData.agreePrivacy) {
      toast.error('필수 약관에 동의해주세요', {
        position: "top-center",
        autoClose: 3000,
      });
      setErrors(prev => ({ 
        ...prev, 
        agreeTerms: !formData.agreeTerms ? '이용약관에 동의해주세요.' : undefined,
        agreePrivacy: !formData.agreePrivacy ? '개인정보 처리방침에 동의해주세요.' : undefined
      }));
      return;
    }
    
    if (validateForm()) {
      try {
        setIsSubmitting(true);
        const loadingToast = toast.loading('회원가입 처리 중...', {
          position: "top-center"
        });
        
        const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown';
        
        const signupData = {
          email: formData.email,
          name: formData.name,
          birthdate: formData.birthdate,
          gender: formData.gender,
          phone: formData.phone,
          additionalPhone: formData.additionalPhone,
          zipcode: formData.zipcode,
          roadAddress: formData.roadAddress,
          jibunAddress: formData.jibunAddress,
          detailAddress: formData.detailAddress,
          additionalAddress: formData.additionalAddress,
          academicGroup: formData.academicGroup,
          schoolName: formData.schoolName,
          major: formData.major,
          grade: formData.grade,
          jobGroup: formData.jobGroup,
          companyName: formData.companyName,
          jobDescription: formData.jobDescription,
          username: formData.username.toLowerCase(),
          password: formData.password,
          agreeTerms: formData.agreeTerms,
          agreePrivacy: formData.agreePrivacy,
          agreeMarketing: formData.agreeMarketing,
          instituteSeq: formData.instituteSeq || localStorage.getItem('institute_seq'),
          turnSeq: formData.turnSeq || localStorage.getItem('turn_seq'),
          userAgent: userAgent,
          type: 'organization'
        };

        const response = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupData),
        });

        const data = await response.json();
        toast.dismiss(loadingToast);

        if (data.success) {
          toast.success('기관 회원가입이 완료되었습니다! 메인페이지로 이동합니다.', {
            position: "top-center",
            autoClose: 2000,
          });
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        } else {
          console.error('회원가입 실패:', data.message, data.error);
          toast.error(data.message || '회원가입에 실패했습니다', {
            position: "top-center",
            autoClose: 3000,
          });
          setErrors({
            username: data.message + (data.error ? ` (${data.error})` : '')
          });
        }
      } catch (error) {
        console.error('회원가입 오류:', error);
        toast.error('회원가입 처리 중 오류가 발생했습니다', {
          position: "top-center",
          autoClose: 3000,
        });
        setErrors({
          username: '회원가입 요청 중 오류가 발생했습니다.'
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast.error('입력 정보를 확인해주세요', {
        position: "top-center",
        autoClose: 3000,
      });
    }
  };

  // form의 onSubmit 이벤트 핸들러 (기본 제출 동작 방지용)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep < 5) {
        toast.info('각 단계별로 다음 버튼을 클릭하여 진행해주세요', {
          position: "top-center",
          autoClose: 2000,
        });
    } else {
        toast.info('가입하기 버튼을 클릭하여 가입을 진행해주세요', {
          position: "top-center",
          autoClose: 2000,
        });
    }
  };

  // 전체 폼 유효성 검사
  const validateForm = () => {
    const newErrors: FormErrors = {};
    
    if (!usernameChecked) {
      newErrors.username = '아이디 중복 확인을 해주세요.';
    }
    if (formData.password.length < 6 || !/^[a-zA-Z0-9]+$/.test(formData.password)) {
      newErrors.password = '비밀번호는 6자 이상, 영문과 숫자만 사용 가능합니다.';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }
    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요.';
    }
    if (!formData.gender) {
      newErrors.gender = '성별을 선택해주세요.';
    }
    if (!formData.birthdate) {
      newErrors.birthdate = '생년월일을 입력해주세요.';
    }
    if (!formData.phone || !/^\d+$/.test(formData.phone)) {
      newErrors.phone = '휴대전화는 숫자만 입력 가능합니다.';
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요.';
    }
    if (!formData.zipcode || !formData.roadAddress) {
      newErrors.zipcode = '주소를 입력해주세요.';
    }
    if (!formData.academicGroup) {
      newErrors.academicGroup = '학업군을 선택해주세요.';
    }
    if (!formData.jobGroup) {
      newErrors.jobGroup = '직업군을 선택해주세요.';
    }
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = '이용약관에 동의해주세요.';
    }
    if (!formData.agreePrivacy) {
      newErrors.agreePrivacy = '개인정보 처리방침에 동의해주세요.';
    }
    if (!codeVerified) {
      newErrors.sessionCode = '기관 회차코드 확인이 필요합니다.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 테스트 데이터 로드 함수
  const loadTestData = () => {
    const randomSuffix = Math.floor(10 + Math.random() * 90).toString();
    const testUsername = `testuser${randomSuffix}`;
    
    const testData = {
      username: testUsername,
      password: '111111',
      confirmPassword: '111111',
      name: '테스트 기관사용자',
      gender: 'male',
      birthdate: '1990-01-01',
      phone: '01012345678',
      additionalPhone: '01087654321',
      email: 'testorg@example.com',
      zipcode: '06141',
      roadAddress: '서울특별시 강남구 테헤란로 123',
      jibunAddress: '서울특별시 강남구 역삼동 123-45',
      detailAddress: '테스트 빌딩 101호',
      additionalAddress: '(역삼동)',
      academicGroup: 'URE0012',
      schoolName: '테스트대학교',
      major: '컴퓨터공학',
      grade: '4학년',
      jobGroup: 'URJ0002',
      companyName: '테스트 기관',
      jobDescription: '기관 관리자',
      agreeTerms: true,
      agreePrivacy: true,
      agreeMarketing: true,
      sessionCode: 'F2FLJT01',
      instituteSeq: '1',
      turnSeq: '1'
    };
    
    setFormData(testData);
    
    setUsernameChecked(true);
    setUsernameCheckMessage('사용 가능한 아이디입니다.');
    setCodeVerified(true);
    setCodeCheckMessage('테스트 기관 - 유효한 회차코드입니다.');
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('institute_seq', testData.instituteSeq);
      localStorage.setItem('turn_seq', testData.turnSeq);
      localStorage.setItem('institute_name', '테스트 기관');
    }
    
    toast.success('테스트 데이터가 로드되었습니다! 이제 다음 단계로 이동하세요.', {
      position: "top-center",
      autoClose: 2000,
    });
  };

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        toastStyle={{ 
          fontFamily: 'sans-serif',
          borderRadius: '8px',
          fontSize: '14px'
        }}
      />
      
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={loadTestData}
          className="py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75"
        >
          테스트 데이터 로드
        </button>
      </div>

      <ProgressBar />
      
      <form className="space-y-8" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        {/* 단계 1: 기관 확인 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">기관 확인</h3>
            
            <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-col space-y-2">
                <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-700">
                  소속 기관에서 발급받으신 회차코드를 입력하여 주십시오. <span className="text-red-600">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="sessionCode"
                    name="sessionCode"
                    value={formData.sessionCode}
                    onChange={handleChange}
                    className={`flex-1 px-3 py-2 border ${errors.sessionCode ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                  />
                  <button
                    type="button"
                    onClick={verifySessionCode}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    유효성 검사
                  </button>
                </div>
                {codeCheckMessage && (
                  <p className={`mt-1 text-sm ${codeVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {codeCheckMessage}
                  </p>
                )}
                {errors.sessionCode && <p className="mt-1 text-sm text-red-600">{errors.sessionCode}</p>}
              </div>
            </div>
          </div>
        )}

        {/* 단계 2: 기본 정보 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">기본 정보</h3>
            
            <div className="grid grid-cols-1 gap-6">
              {/* 아이디 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  아이디 <span className="text-red-600">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="6자 이상, 영문과 숫자만 사용가능"
                  />
                  <button
                    type="button"
                    onClick={checkUsername}
                    className="mt-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap transition-colors"
                  >
                    중복확인
                  </button>
                </div>
                {usernameCheckMessage && <p className={`mt-1 text-sm ${usernameChecked ? 'text-green-600' : 'text-red-600'}`}>{usernameCheckMessage}</p>}
                {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
              </div>
              
              {/* 이름 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
              
              {/* 비밀번호 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="6자 이상, 영문과 숫자만 사용가능"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>
              
              {/* 비밀번호 확인 */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인 <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
              
              {/* 성별 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  성별 <span className="text-red-600">*</span>
                </label>
                <div className="mt-1 flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">남성</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">여성</span>
                  </label>
                </div>
                {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender}</p>}
              </div>
              
              {/* 생년월일 */}
              <div>
                <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700 mb-1">
                  생년월일 <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  id="birthdate"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.birthdate && <p className="mt-1 text-sm text-red-600">{errors.birthdate}</p>}
              </div>
              
              {/* 휴대전화 */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  휴대전화 <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="'-' 없이 숫자만 입력"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
              
              {/* 추가 연락처 */}
              <div>
                <label htmlFor="additionalPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  추가 연락처
                </label>
                <input
                  type="tel"
                  id="additionalPhone"
                  name="additionalPhone"
                  value={formData.additionalPhone}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="'-' 없이 숫자만 입력"
                />
              </div>
              
              {/* 이메일 주소 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 주소 <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">이메일 수신이 안되면, 아이디 또는 비밀번호 찾기가 불가능 합니다.</p>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>
          </div>
        )}

        {/* 단계 3: 주소 정보 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">주소 정보</h3>
            <p className="text-sm text-gray-600 mb-4">결과지가 우편으로 발송되오니, 정확히 입력하여 주시기 바랍니다.</p>
            
            <div className="space-y-6">
              {/* 우편번호 및 주소 검색 */}
              <div>
                <label htmlFor="zipcode" className="block text-sm font-medium text-gray-700 mb-1">
                  우편번호 <span className="text-red-600">*</span>
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="zipcode"
                    name="zipcode"
                    value={formData.zipcode}
                    readOnly
                    className="mt-1 block w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPostcode(true)}
                    className="mt-1 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap transition-colors"
                  >
                    주소찾기
                  </button>
                </div>
                {errors.zipcode && <p className="mt-1 text-sm text-red-600">{errors.zipcode}</p>}
              </div>
              
              {/* 도로명 주소 */}
              <div>
                <label htmlFor="roadAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  도로명 주소 <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="roadAddress"
                  name="roadAddress"
                  value={formData.roadAddress}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
              </div>
              
              {/* 지번 주소 */}
              <div>
                <label htmlFor="jibunAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  지번 주소
                </label>
                <input
                  type="text"
                  id="jibunAddress"
                  name="jibunAddress"
                  value={formData.jibunAddress}
                  readOnly
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                />
              </div>
              
              {/* 상세주소 */}
              <div>
                <label htmlFor="detailAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  상세주소
                </label>
                <input
                  type="text"
                  id="detailAddress"
                  name="detailAddress"
                  value={formData.detailAddress}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="동, 호수 등 상세주소를 입력하세요"
                />
              </div>
            </div>
          </div>
        )}

        {/* 단계 4: 학업/직업 정보 */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">학업/직업 정보</h3>
            
            <div className="space-y-6">
              {/* 학업군 */}
              <div>
                <label htmlFor="academicGroup" className="block text-sm font-medium text-gray-700 mb-1">
                  학업군 <span className="text-red-600">*</span>
                </label>
                <select
                  id="academicGroup"
                  name="academicGroup"
                  value={formData.academicGroup}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">학업군을 선택하세요</option>
                  {academicGroups.map(group => (
                    <option key={group.value} value={group.value}>{group.label}</option>
                  ))}
                </select>
                {errors.academicGroup && <p className="mt-1 text-sm text-red-600">{errors.academicGroup}</p>}
              </div>
              
              {/* 학교명 */}
              <div>
                <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700 mb-1">
                  학교명
                </label>
                <input
                  type="text"
                  id="schoolName"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* 전공 */}
              <div>
                <label htmlFor="major" className="block text-sm font-medium text-gray-700 mb-1">
                  전공
                </label>
                <input
                  type="text"
                  id="major"
                  name="major"
                  value={formData.major}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* 학년 */}
              <div>
                <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                  학년
                </label>
                <select
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">학년을 선택하세요</option>
                  {grades.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              
              {/* 직업군 */}
              <div>
                <label htmlFor="jobGroup" className="block text-sm font-medium text-gray-700 mb-1">
                  직업군 <span className="text-red-600">*</span>
                </label>
                <select
                  id="jobGroup"
                  name="jobGroup"
                  value={formData.jobGroup}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">직업군을 선택하세요</option>
                  {jobGroups.map(group => (
                    <option key={group.value} value={group.value}>{group.label}</option>
                  ))}
                </select>
                {errors.jobGroup && <p className="mt-1 text-sm text-red-600">{errors.jobGroup}</p>}
              </div>
              
              {/* 회사명 */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                  회사명
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* 직무 */}
              <div>
                <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  직무
                </label>
                <input
                  type="text"
                  id="jobDescription"
                  name="jobDescription"
                  value={formData.jobDescription}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* 단계 5: 약관 동의 */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">약관 동의</h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="agreeTerms" className="text-sm text-gray-700">
                  <span className="text-red-600">*</span> 이용약관에 동의합니다.
                </label>
              </div>
              {errors.agreeTerms && <p className="text-sm text-red-600">{errors.agreeTerms}</p>}
              
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreePrivacy"
                  name="agreePrivacy"
                  checked={formData.agreePrivacy}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="agreePrivacy" className="text-sm text-gray-700">
                  <span className="text-red-600">*</span> 개인정보 처리방침에 동의합니다.
                </label>
              </div>
              {errors.agreePrivacy && <p className="text-sm text-red-600">{errors.agreePrivacy}</p>}
              
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="agreeMarketing"
                  name="agreeMarketing"
                  checked={formData.agreeMarketing}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="agreeMarketing" className="text-sm text-gray-700">
                  마케팅 정보 수신에 동의합니다. (선택)
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* 네비게이션 버튼 */}
        <div className="flex justify-between pt-6">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              이전
            </button>
          )}
          
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignup}
              disabled={isSubmitting}
              className="ml-auto px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '가입 중...' : '가입하기'}
            </button>
          )}
        </div>
      </form>

      {/* 주소 검색 모달 */}
      {showPostcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">주소 검색</h3>
              <button
                onClick={() => setShowPostcode(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <DaumPostcode
              onComplete={handlePostcodeComplete}
              style={{ width: '100%', height: '400px' }}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default OrganizationSignupForm;