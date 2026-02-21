// 카테고리별 테마 정의
export interface CategoryTheme {
  name: string;
  // 기본 색상
  primaryColor: string;      // 주요 강조색
  secondaryColor: string;    // 보조색
  backgroundColor: string;   // 배경색
  textColor: string;         // 기본 텍스트색
  accentColor: string;       // 포인트색
  
  // 그라디언트
  gradientFrom: string;
  gradientTo: string;
  overlayGradient: string;   // 이미지 오버레이용
  
  // 폰트 스타일
  headingStyle: string;      // 헤드라인 스타일
  bodyStyle: string;         // 본문 스타일
  
  // 배지/라벨 스타일
  badgeStyle: string;
  
  // 카드 스타일
  cardStyle: string;
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  '패션/의류': {
    name: '패션/의류',
    primaryColor: 'slate-900',
    secondaryColor: 'slate-600',
    backgroundColor: 'white',
    textColor: 'slate-900',
    accentColor: 'black',
    gradientFrom: 'from-slate-900',
    gradientTo: 'to-slate-700',
    overlayGradient: 'bg-gradient-to-t from-black/70 via-black/30 to-transparent',
    headingStyle: 'font-light tracking-wide uppercase',
    bodyStyle: 'font-light tracking-wide',
    badgeStyle: 'bg-black text-white text-xs tracking-widest uppercase',
    cardStyle: 'bg-white border border-slate-200',
  },
  
  '뷰티/화장품': {
    name: '뷰티/화장품',
    primaryColor: 'rose-500',
    secondaryColor: 'pink-400',
    backgroundColor: 'rose-50',
    textColor: 'slate-800',
    accentColor: 'rose-600',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-pink-400',
    overlayGradient: 'bg-gradient-to-t from-rose-900/60 via-transparent to-transparent',
    headingStyle: 'font-medium',
    bodyStyle: 'font-light',
    badgeStyle: 'bg-rose-500 text-white text-xs rounded-full',
    cardStyle: 'bg-white/80 backdrop-blur border border-rose-100',
  },
  
  '식품/건강': {
    name: '식품/건강',
    primaryColor: 'green-600',
    secondaryColor: 'orange-500',
    backgroundColor: 'green-50',
    textColor: 'slate-800',
    accentColor: 'green-700',
    gradientFrom: 'from-green-600',
    gradientTo: 'to-green-400',
    overlayGradient: 'bg-gradient-to-t from-green-900/60 via-transparent to-transparent',
    headingStyle: 'font-bold',
    bodyStyle: 'font-medium',
    badgeStyle: 'bg-green-600 text-white text-xs rounded-lg',
    cardStyle: 'bg-white border-2 border-green-100',
  },
  
  '생활/가전': {
    name: '생활/가전',
    primaryColor: 'blue-600',
    secondaryColor: 'slate-500',
    backgroundColor: 'slate-50',
    textColor: 'slate-800',
    accentColor: 'blue-700',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-400',
    overlayGradient: 'bg-gradient-to-t from-slate-900/70 via-transparent to-transparent',
    headingStyle: 'font-semibold',
    bodyStyle: 'font-normal',
    badgeStyle: 'bg-blue-600 text-white text-xs',
    cardStyle: 'bg-white shadow-lg border border-slate-100',
  },
  
  '유아/키즈': {
    name: '유아/키즈',
    primaryColor: 'amber-400',
    secondaryColor: 'sky-400',
    backgroundColor: 'amber-50',
    textColor: 'slate-700',
    accentColor: 'amber-500',
    gradientFrom: 'from-amber-400',
    gradientTo: 'to-orange-300',
    overlayGradient: 'bg-gradient-to-t from-amber-900/50 via-transparent to-transparent',
    headingStyle: 'font-bold rounded-lg',
    bodyStyle: 'font-medium',
    badgeStyle: 'bg-amber-400 text-slate-800 text-xs rounded-full',
    cardStyle: 'bg-white rounded-2xl shadow-md border-2 border-amber-100',
  },
  
  '스포츠/레저': {
    name: '스포츠/레저',
    primaryColor: 'red-600',
    secondaryColor: 'slate-800',
    backgroundColor: 'slate-900',
    textColor: 'white',
    accentColor: 'red-500',
    gradientFrom: 'from-red-600',
    gradientTo: 'to-red-800',
    overlayGradient: 'bg-gradient-to-t from-red-900/80 via-black/40 to-transparent',
    headingStyle: 'font-black uppercase tracking-tight',
    bodyStyle: 'font-bold uppercase',
    badgeStyle: 'bg-red-600 text-white text-xs font-bold uppercase',
    cardStyle: 'bg-slate-800 border border-red-500/30',
  },
  
  '디지털/IT': {
    name: '디지털/IT',
    primaryColor: 'violet-600',
    secondaryColor: 'cyan-400',
    backgroundColor: 'slate-950',
    textColor: 'white',
    accentColor: 'cyan-400',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-cyan-400',
    overlayGradient: 'bg-gradient-to-t from-slate-950/90 via-violet-900/30 to-transparent',
    headingStyle: 'font-bold',
    bodyStyle: 'font-medium',
    badgeStyle: 'bg-gradient-to-r from-violet-600 to-cyan-400 text-white text-xs',
    cardStyle: 'bg-slate-900/80 backdrop-blur border border-violet-500/30',
  },
  
  '기타': {
    name: '기타',
    primaryColor: 'slate-700',
    secondaryColor: 'slate-500',
    backgroundColor: 'white',
    textColor: 'slate-800',
    accentColor: 'blue-600',
    gradientFrom: 'from-slate-700',
    gradientTo: 'to-slate-500',
    overlayGradient: 'bg-gradient-to-t from-black/60 via-transparent to-transparent',
    headingStyle: 'font-semibold',
    bodyStyle: 'font-normal',
    badgeStyle: 'bg-slate-700 text-white text-xs',
    cardStyle: 'bg-white border border-slate-200 shadow',
  },
};

// 카테고리에 맞는 테마 가져오기
export function getTheme(category: string): CategoryTheme {
  return CATEGORY_THEMES[category] || CATEGORY_THEMES['기타'];
}

// ========================================
// SalesLogicType별 텍스트 스타일 정의
// ========================================

export interface TextStyleConfig {
  // 메인 텍스트 (keyMessage)
  mainSize: string;           // Tailwind 텍스트 크기
  mainWeight: string;         // 폰트 굵기
  mainStyle: string;          // 추가 스타일 (italic 등)
  mainSpacing: string;        // 자간
  
  // 서브 텍스트 (subMessage)
  subSize: string;
  subWeight: string;
  subStyle: string;
  
  // 레이아웃
  alignment: 'left' | 'center' | 'right';
  verticalPosition: 'top' | 'center' | 'bottom';
  padding: string;
  gap: string;                // 메인-서브 간격
  
  // 배지/라벨
  showBadge: boolean;
  badgeText?: string;
  
  // 특수 효과
  animation?: string;
  decoration?: string;        // 밑줄, 하이라이트 등
}

export const LOGIC_TYPE_STYLES: Record<string, TextStyleConfig> = {
  // 후킹 - 시선 강탈, 아주 크게
  hook: {
    mainSize: 'text-3xl md:text-5xl lg:text-6xl',
    mainWeight: 'font-black',
    mainStyle: '',
    mainSpacing: 'tracking-tight',
    subSize: 'text-lg md:text-xl',
    subWeight: 'font-medium',
    subStyle: '',
    alignment: 'center',
    verticalPosition: 'center',
    padding: 'p-8 md:p-12',
    gap: 'mt-4 md:mt-6',
    showBadge: false,
    decoration: 'underline decoration-4 underline-offset-8',
  },
  
  // 해결책 - 명확하고 깔끔하게
  solution: {
    mainSize: 'text-2xl md:text-4xl',
    mainWeight: 'font-bold',
    mainStyle: '',
    mainSpacing: 'tracking-normal',
    subSize: 'text-base md:text-lg',
    subWeight: 'font-normal',
    subStyle: '',
    alignment: 'center',
    verticalPosition: 'center',
    padding: 'p-6 md:p-10',
    gap: 'mt-3 md:mt-4',
    showBadge: true,
    badgeText: 'SOLUTION',
  },
  
  // 스펙/비교 - 작게, 이미지 집중
  clarity: {
    mainSize: 'text-lg md:text-2xl',
    mainWeight: 'font-semibold',
    mainStyle: '',
    mainSpacing: 'tracking-wide',
    subSize: 'text-sm md:text-base',
    subWeight: 'font-normal',
    subStyle: '',
    alignment: 'left',
    verticalPosition: 'bottom',
    padding: 'p-4 md:p-6',
    gap: 'mt-2',
    showBadge: true,
    badgeText: 'SPEC',
  },
  
  // 사회적 증거 - 인용구 스타일
  socialProof: {
    mainSize: 'text-xl md:text-3xl',
    mainWeight: 'font-light',
    mainStyle: 'italic',
    mainSpacing: 'tracking-normal',
    subSize: 'text-sm md:text-base',
    subWeight: 'font-medium',
    subStyle: '',
    alignment: 'center',
    verticalPosition: 'bottom',
    padding: 'p-8 md:p-12',
    gap: 'mt-4',
    showBadge: false,
    decoration: 'before:content-["""] after:content-["""]',
  },
  
  // 활용법 - 친근하고 실용적
  service: {
    mainSize: 'text-xl md:text-3xl',
    mainWeight: 'font-bold',
    mainStyle: '',
    mainSpacing: 'tracking-normal',
    subSize: 'text-base md:text-lg',
    subWeight: 'font-normal',
    subStyle: '',
    alignment: 'center',
    verticalPosition: 'top',
    padding: 'p-6 md:p-8',
    gap: 'mt-3',
    showBadge: true,
    badgeText: 'HOW TO',
  },
  
  // 신뢰/보장 - 안정감, 신뢰감
  riskReversal: {
    mainSize: 'text-xl md:text-2xl',
    mainWeight: 'font-semibold',
    mainStyle: '',
    mainSpacing: 'tracking-wide',
    subSize: 'text-sm md:text-base',
    subWeight: 'font-normal',
    subStyle: '',
    alignment: 'center',
    verticalPosition: 'bottom',
    padding: 'p-6 md:p-8',
    gap: 'mt-2',
    showBadge: true,
    badgeText: '✓ GUARANTEE',
  },
  
  // 브랜드 스토리 - 감성적, 세련됨
  brandStory: {
    mainSize: 'text-2xl md:text-4xl',
    mainWeight: 'font-light',
    mainStyle: '',
    mainSpacing: 'tracking-widest',
    subSize: 'text-base md:text-lg',
    subWeight: 'font-light',
    subStyle: 'italic',
    alignment: 'center',
    verticalPosition: 'center',
    padding: 'p-10 md:p-16',
    gap: 'mt-6',
    showBadge: false,
  },
  
  // 경쟁사 비교 - 명확한 대비
  comparison: {
    mainSize: 'text-xl md:text-3xl',
    mainWeight: 'font-bold',
    mainStyle: '',
    mainSpacing: 'tracking-tight',
    subSize: 'text-sm md:text-base',
    subWeight: 'font-medium',
    subStyle: '',
    alignment: 'left',
    verticalPosition: 'center',
    padding: 'p-6 md:p-8',
    gap: 'mt-3',
    showBadge: true,
    badgeText: 'VS',
  },
};

// SalesLogicType에 맞는 텍스트 스타일 가져오기
export function getTextStyle(logicType: string): TextStyleConfig {
  return LOGIC_TYPE_STYLES[logicType] || LOGIC_TYPE_STYLES['solution'];
}

