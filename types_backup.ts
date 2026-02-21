export type Platform = 'coupang' | 'smartstore';

// 페이지 길이 타입
export type PageLength = 5 | 7 | 9 | 'auto';

// 판매 논리 섹션 타입
export type SalesLogicType = 
  | 'hook'           // 후킹 (문제 제기)
  | 'solution'       // 해결책 제시
  | 'clarity'        // 스펙/크기 비교
  | 'socialProof'    // 리뷰/사회적 증거
  | 'service'        // 활용법/서비스
  | 'riskReversal'   // 신뢰/AS/환불
  | 'brandStory'     // 브랜드 스토리 (9장용)
  | 'comparison';    // 경쟁사 비교 (9장용)

// 상세페이지 섹션 정의
export interface DetailSection {
  id: string;
  order: number;
  logicType: SalesLogicType;
  title: string;              // 섹션 제목 (예: "이런 고민 있으셨죠?")
  keyMessage: string;         // 핵심 카피 (한글만)
  subMessage?: string;        // 보조 카피
  visualPrompt: string;       // 이미지 생성 프롬프트
  imageUrl?: string;          // 생성된 이미지 URL
  isGenerating?: boolean;
  textPosition: 'top' | 'center' | 'bottom';  // 텍스트 위치
  textStyle: 'light' | 'dark';                // 텍스트 색상
}

// 썸네일 설정
export interface ThumbnailConfig {
  style: 'clean' | 'lifestyle' | 'creative';
  includeHand: boolean;
  includeModel: boolean;
  textOverlay: string;
  textPosition: 'top' | 'center' | 'bottom';
}

export interface ProductData {
  name: string;
  description: string;
  targetAudience: string;
  images: string[]; 
  selectedModel: 'flash' | 'pro'; 
  platform: Platform;
  price: number;
  discountRate: number;
  promotionText: string;
  // 새로 추가
  pageLength?: PageLength;              // 페이지 길이 (기본값: 'auto')
  category?: string;                    // 카테고리
  targetGender?: 'male' | 'female' | 'all';  // 타겟 성별 (기본값: 'all')
  targetAge?: string[];                 // 타겟 연령대 (기본값: [])
  thumbnailConfig?: ThumbnailConfig;   // 썸네일 설정
}

// 새 상세페이지 생성 결과
export interface GeneratedDetailPage {
  sections: DetailSection[];           // 5~9개 섹션
  thumbnail?: {
    imageUrl: string;
    prompt: string;
  };
}

// 기존 GeneratedCopy (하위 호환성 유지)
export interface GeneratedCopy {
  catchphrase: string;
  headline: string;
  emotionalBenefit: string;
  // Long-form content structure matches reference
  painPoints: { title: string; description: string }[]; 
  solution: string; 
  features: { title: string; subtitle: string; description: string }[]; 
  usageScenarios: { situation: string; benefit: string }[]; 
  specs: { label: string; value: string }[];
  faq: { question: string; answer: string }[];
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface AppState {
  step: 'input' | 'processing' | 'preview';
  productData: ProductData;
  originalImages: string[];
  generatedImages: GeneratedImage[]; 
  mainImageIndex: number; 
  generatedCopy: GeneratedCopy | null;
  generatedPage: GeneratedDetailPage | null;  // 새로운 상세페이지 구조
  isEditingImage: boolean;
  generationProgress?: {                      // 생성 진행률
    current: number;
    total: number;
    message: string;
  };
}

// 히스토리 아이템 타입
export interface HistoryItem {
  id: string;
  timestamp: number;
  productName: string;
  productData: ProductData;
  generatedImages: GeneratedImage[];
  generatedCopy: GeneratedCopy;
  thumbnail: string;
  originalImages?: string[];  // 참고 이미지 URL 추가
}

