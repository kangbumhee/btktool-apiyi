import { ProductData, DetailSection, SalesLogicType, PageLength, GeneratedDetailPage } from '../types';
import { uploadToCloudinary } from './cloudinaryService';

const getNanoBananaApiKey = (): string => {
  const apiKey = localStorage.getItem('nanoBananaApiKey');
  if (!apiKey || !apiKey.trim()) {
    throw new Error('APIYI API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
  }
  return apiKey.trim();
};

// 이미지 형식 지원 확인 (base64 data URL → mimeType, data 추출)
const ensureSupportedImage = async (img: string): Promise<{ mimeType: string; data: string }> => {
  if (!img.startsWith('data:')) throw new Error('Invalid image format');
  const match = img.match(/^data:image\/([a-z+]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data URL format');
  return { mimeType: `image/${match[1]}`, data: match[2] };
};

// 폴백 이미지 (플레이스홀더 SVG)
const getFallbackImage = (): string =>
  `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect fill="#f3f4f6" width="400" height="600"/><text x="200" y="300" fill="#9ca3af" font-family="sans-serif" font-size="14" text-anchor="middle">이미지 생성 실패</text></svg>')}`;

// ========== APIYI API 설정 ==========
const APIYI_BASE_URL = "https://vip.apiyi.com/v1beta/models";

// APIYI로 이미지 생성 (동기 응답, 폴링 불필요)
const generateImageWithAPIYI = async (
  prompt: string,
  referenceImages: string[],
  resolution: string = "4K",
  aspectRatio: string = "16:9",
  isProModel: boolean = true
): Promise<string> => {
  const apiKey = getNanoBananaApiKey();
  const modelName = isProModel ? "gemini-3-pro-image-preview-4k" : "gemini-2.5-flash-image";
  const url = `${APIYI_BASE_URL}/${modelName}:generateContent`;

  // parts 배열 구성
  const parts: any[] = [];

  // 참조 이미지가 있으면 base64로 직접 포함 (최대 3장, 요청 크기 제한)
  const maxRefImages = Math.min(referenceImages.length, 3);
  for (let i = 0; i < maxRefImages; i++) {
    const img = referenceImages[i];
    if (img.startsWith('data:')) {
      const supported = await ensureSupportedImage(img);
      parts.push({
        inline_data: {
          mime_type: supported.mimeType,
          data: supported.data
        }
      });
    }
  }

  // 텍스트 프롬프트 추가
  parts.push({ text: prompt });

  const body = {
    contents: [
      {
        role: "user",
        parts: parts
      }
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
      resolution: resolution,
      aspectRatio: aspectRatio
    }
  };

  console.log(`APIYI 호출: ${modelName}, 참조이미지 ${maxRefImages}장, 해상도 ${resolution}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90초 타임아웃

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;

      // 크레딧 부족 감지
      if (errorMessage.toLowerCase().includes("insufficient") ||
          errorMessage.toLowerCase().includes("quota") ||
          errorMessage.toLowerCase().includes("billing") ||
          response.status === 429) {
        throw new Error("CREDITS_INSUFFICIENT");
      }

      throw new Error(`APIYI API 오류: ${errorMessage}`);
    }

    const data = await response.json();

    // 응답에서 이미지 추출
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error("APIYI 응답에 이미지가 없습니다.");
    }

    const contentParts = candidates[0].content?.parts;
    if (!contentParts || contentParts.length === 0) {
      throw new Error("APIYI 응답 파싱 실패: parts가 비어있습니다.");
    }

    // inlineData에서 base64 이미지 추출 (camelCase 또는 snake_case)
    for (const part of contentParts) {
      const inlineData = part.inlineData || part.inline_data;
      if (inlineData && inlineData.data) {
        const mimeType = inlineData.mimeType || inlineData.mime_type || "image/png";
        const base64Image = `data:${mimeType};base64,${inlineData.data}`;

        // Cloudinary에 업로드해서 URL로 변환
        console.log("APIYI 이미지 생성 성공, Cloudinary 업로드 중...");
        try {
          const cloudinaryUrl = await uploadToCloudinary(base64Image, 'generated-images');
          return cloudinaryUrl;
        } catch (uploadError) {
          console.warn("Cloudinary 업로드 실패, base64 직접 반환:", uploadError);
          return base64Image;
        }
      }
    }

    throw new Error("APIYI 응답에서 이미지 데이터를 찾을 수 없습니다.");

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("이미지 생성 시간 초과 (90초)");
    }
    throw error;
  }
};

const TEXT_MODEL = 'gemini-2.5-flash';

// ========================================
// 1. 판매 논리 프레임워크 정의
// ========================================

const SALES_LOGIC_FRAMEWORK = {
  5: ['hook', 'solution', 'clarity', 'service', 'riskReversal'] as SalesLogicType[],
  7: ['hook', 'solution', 'clarity', 'socialProof', 'service', 'riskReversal', 'comparison'] as SalesLogicType[],
  9: ['hook', 'solution', 'clarity', 'socialProof', 'service', 'brandStory', 'comparison', 'riskReversal', 'service'] as SalesLogicType[],
};

const LOGIC_TYPE_INFO: Record<SalesLogicType, { title: string; description: string }> = {
  hook: { title: '문제 제기', description: '고객의 불편함과 고민을 자극하는 후킹' },
  solution: { title: '해결책 제시', description: '이 상품이 어떻게 문제를 해결하는지' },
  clarity: { title: '스펙/비교', description: '크기, 용량, 성분 등 구체적 정보' },
  socialProof: { title: '사회적 증거', description: '리뷰, 판매량, 수상 경력 등' },
  service: { title: '활용법', description: '사용 방법, 활용 팁, 스타일링' },
  riskReversal: { title: '신뢰/보장', description: 'AS, 환불 정책, 인증, 보증' },
  brandStory: { title: '브랜드 스토리', description: '브랜드 철학, 제조 과정, 장인 정신' },
  comparison: { title: '경쟁사 비교', description: '타사 대비 우위점, 차별화 포인트' },
};

// ========================================
// 2. 상세페이지 기획 함수
// ========================================

export async function planDetailPage(productData: ProductData): Promise<DetailSection[]> {
  const apiKey = getNanoBananaApiKey();
  
  // 페이지 길이 결정
  let targetLength: 5 | 7 | 9 = 7; // 기본값 설정
  
  if (productData.pageLength === 'auto') {
    // AI가 결정: 가격과 카테고리 기반
    if (productData.price > 100000 || ['뷰티/화장품', '디지털/IT'].includes(productData.category || '')) {
      targetLength = 9;
    } else if (productData.price > 30000) {
      targetLength = 7;
    } else {
      targetLength = 5;
    }
  } else if (productData.pageLength === 5 || productData.pageLength === 7 || productData.pageLength === 9) {
    targetLength = productData.pageLength;
  }

  const logicSequence = SALES_LOGIC_FRAMEWORK[targetLength];

  const prompt = `
당신은 한국 이커머스 상세페이지 전문 기획자입니다.
스마트스토어와 쿠팡에서 '팔리는' 상세페이지를 만드는 전략가입니다.

## 상품 정보
- 상품명: ${productData.name}
- 카테고리: ${productData.category || '미지정'}
- 가격: ${productData.price.toLocaleString()}원
- 설명: ${productData.description}
- 타겟: ${productData.targetGender === 'all' ? '전체' : productData.targetGender === 'female' ? '여성' : '남성'} / ${(productData.targetAge || []).join(', ') || '전연령'}
${productData.promotionText ? `- 프로모션: ${productData.promotionText}` : ''}

## 요청 사항
${targetLength}장의 상세페이지 섹션을 기획해주세요.

각 섹션은 아래 판매 논리 순서를 따릅니다:
${logicSequence.map((logic, idx) => `${idx + 1}. ${LOGIC_TYPE_INFO[logic].title} (${logic}): ${LOGIC_TYPE_INFO[logic].description}`).join('\n')}

## 필수 규칙
1. keyMessage는 반드시 100% 한국어로 작성 (영어 헤드라인 절대 금지)
2. 감성적이면서도 구체적인 카피 작성
3. 타겟 연령대와 성별에 맞는 톤앤매너 사용
4. visualPrompt는 영어로, 9:16 세로 이미지에 적합하게 작성

## 출력 형식 (JSON)
{
  "sections": [
    {
      "order": 1,
      "logicType": "hook",
      "title": "섹션 제목",
      "keyMessage": "메인 카피 (한글만, 2줄 이내)",
      "subMessage": "보조 카피 (선택)",
      "visualPrompt": "English prompt for 9:16 vertical product image...",
      "textPosition": "center",
      "textStyle": "light"
    }
  ]
}

JSON만 출력하세요.
`;

  const response = await fetch(
    `https://vip.apiyi.com/v1beta/models/${TEXT_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Gemini API 오류:', error);
    throw new Error('상세페이지 기획 생성 실패');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('기획 생성 실패: JSON 형식이 아닙니다');
  
  const parsed = JSON.parse(jsonMatch[0]);
  
  return parsed.sections.map((section: any, idx: number) => ({
    id: `section-${idx + 1}`,
    order: section.order || idx + 1,
    logicType: section.logicType,
    title: section.title,
    keyMessage: section.keyMessage,
    subMessage: section.subMessage,
    visualPrompt: section.visualPrompt,
    textPosition: section.textPosition || 'center',
    textStyle: section.textStyle || 'light',
    isGenerating: false
  }));
}

// ========================================
// 3. 이미지 생성 함수 (텍스트 포함 + Img2Img)
// ========================================

export async function generateSectionImage(
  section: DetailSection,
  productData: ProductData,
  referenceImage?: string
): Promise<string> {
  
  const textInstruction = `
IMPORTANT RULES - MUST FOLLOW:
- NO text, titles, watermarks, or Korean characters on the image
- NO boxes, frames, borders, or rectangular shapes for text
- NO placeholder areas or empty boxes
- Create a seamless, natural product image
- Clean visual background suitable for ${productData.category || '일반'} category
- Focus on high-quality product photography only
`;

  const fullPrompt = `
Create a high-quality e-commerce product detail image for Korean online shopping.

${section.visualPrompt}

${textInstruction}

Style requirements:
- Professional product photography quality
- Clean, modern Korean e-commerce aesthetic
- Target audience: ${productData.targetGender === 'female' ? 'women' : productData.targetGender === 'male' ? 'men' : 'general'}

Product: ${productData.name}
`;

  try {
    // 참조 이미지: base64 데이터만 APIYI에 전달 (최대 3장)
    const referenceImages: string[] = [];
    if (productData.images.length > 0) {
      const mainImage = productData.images[0];
      if (mainImage.startsWith('data:')) referenceImages.push(mainImage);
    }
    const imageUrl = await generateImageWithAPIYI(fullPrompt, referenceImages, "4K", "9:16", true);
    return imageUrl;
  } catch (error: any) {
    if (error.message === "CREDITS_INSUFFICIENT") throw error;
    console.error('APIYI 이미지 생성 실패:', error);
    return getFallbackImage();
  }
}

// ========================================
// 4. 썸네일 생성 함수 (1:1)
// ========================================

export async function generateThumbnail(productData: ProductData): Promise<string> {
  const config = productData.thumbnailConfig;
  
  const prompt = `
Create a professional e-commerce product thumbnail image.
IMPORTANT: NO TEXT on the image. Clean product photo only.

Product: ${productData.name}
Category: ${productData.category || '일반'}

Style: ${config?.style === 'lifestyle' ? 'Lifestyle shot with context' : config?.style === 'creative' ? 'Creative artistic composition' : 'Clean white background product shot'}

${config?.includeHand ? 'Include a hand model holding or presenting the product naturally.' : ''}
${config?.includeModel ? 'Include a Korean model appropriate for the target demographic.' : ''}

Requirements:
- High-quality product photography
- NO text, NO watermarks, NO titles
- NO boxes, frames, borders, or rectangular shapes
- NO placeholder areas or empty spaces for text
- Seamless, natural product image
- Eye-catching and click-worthy
- Korean market aesthetic
`;

  try {
    const referenceImages: string[] = [];
    if (productData.images.length > 0) {
      const mainImage = productData.images[0];
      if (mainImage.startsWith('data:')) {
        referenceImages.push(mainImage);
      }
    }

    const imageUrl = await generateImageWithAPIYI(
      prompt,
      referenceImages,
      "4K",
      "1:1",
      true
    );
    return imageUrl;
  } catch (error: any) {
    if (error.message === "CREDITS_INSUFFICIENT") {
      throw error;
    }
    console.error('APIYI 썸네일 생성 실패:', error);
    return getFallbackImage();
  }
}

// ========================================
// 5. 전체 상세페이지 생성 (메인 함수)
// ========================================

export async function generateFullDetailPage(
  productData: ProductData,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<GeneratedDetailPage> {
  
  // 1단계: 기획 (순차 - 이건 먼저 완료되어야 함)
  onProgress?.(0, 100, '상세페이지 구조를 기획하고 있습니다...');
  const sections = await planDetailPage(productData);
  
  onProgress?.(10, 100, `${sections.length}개 이미지를 동시에 생성 시작...`);
  
  // 2단계: 모든 섹션 이미지를 병렬로 생성 (Promise.all 사용)
  const imagePromises = sections.map(async (section) => {
    try {
      const imageUrl = await generateSectionImage(
        section,
        productData,
        productData.images[0]
      );
      return {
        ...section,
        imageUrl,
        isGenerating: false
      };
    } catch (error) {
      console.error(`Section ${section.order} generation failed:`, error);
      return {
        ...section,
        isGenerating: false
      };
    }
  });
  
  // 썸네일도 동시에 생성
  const thumbnailPromise = productData.thumbnailConfig 
    ? generateThumbnail(productData)
        .then(thumbnailUrl => ({
          imageUrl: thumbnailUrl,
          prompt: `${productData.name} thumbnail`
        }))
        .catch(error => {
          console.error('Thumbnail generation failed:', error);
          return undefined;
        })
    : Promise.resolve(undefined);
  
  // 진행률 업데이트
  onProgress?.(30, 100, `${sections.length}개 이미지 병렬 생성 중...`);
  
  // 모든 이미지 + 썸네일 동시 완료 대기
  const [generatedSections, thumbnail] = await Promise.all([
    Promise.all(imagePromises),
    thumbnailPromise
  ]);
  
  onProgress?.(100, 100, '완료!');
  
  return {
    sections: generatedSections,
    thumbnail
  };
}

// ========================================
// 6. 개별 섹션 재생성
// ========================================

export async function regenerateSection(
  section: DetailSection,
  productData: ProductData
): Promise<string> {
  return generateSectionImage(section, productData, productData.images[0]);
}

// ========================================
// 7. 섹션 카피 수정 후 재생성
// ========================================

export async function updateSectionCopy(
  section: DetailSection,
  newKeyMessage: string,
  newSubMessage?: string
): Promise<DetailSection> {
  return {
    ...section,
    keyMessage: newKeyMessage,
    subMessage: newSubMessage
  };
}

// ========================================
// 8. 기존 함수들 (유지)
// ========================================

// 상품 이미지 분석 (APIYI Gemini Vision)
export const analyzeProductImage = async (imageBase64: string): Promise<{
  productName: string;
  brand: string;
  category: string;
  features: string[];
}> => {
  const apiKey = getNanoBananaApiKey();
  const supported = await ensureSupportedImage(imageBase64);

  const response = await fetch(
    'https://vip.apiyi.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inline_data: {
                  mime_type: supported.mimeType,
                  data: supported.data
                }
              },
              {
                text: `이 상품 이미지를 분석해서 JSON 형식으로 답해주세요.

반드시 아래 JSON 형식만 출력하세요 (다른 텍스트 없이):
{
  "productName": "정확한 상품명 (브랜드 + 제품명 + 용량/수량)",
  "brand": "브랜드명",
  "category": "카테고리 (예: 건강식품, 화장품, 식품, 가전 등)",
  "features": ["특징1", "특징2", "특징3"]
}

상품명은 네이버 쇼핑에서 검색할 수 있도록 정확하게 작성해주세요.`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('APIYI 이미지 분석 오류:', error);
    throw new Error('이미지 분석에 실패했습니다.');
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 파싱 실패');
  } catch (e) {
    console.error('파싱 오류:', content);
    return {
      productName: '',
      brand: '',
      category: '',
      features: []
    };
  }
};

// APIYI Gemini로 이미지 분석 (글자 없는 상품용 - 기존 Vision API 대체)
export const analyzeImageWithVision = async (imageBase64: string): Promise<{
  productName: string;
  labels: string[];
  logos: string[];
  text: string;
}> => {
  const apiKey = getNanoBananaApiKey();
  const url = 'https://vip.apiyi.com/v1beta/models/gemini-2.5-flash:generateContent';
  const supported = await ensureSupportedImage(imageBase64);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: supported.mimeType,
              data: supported.data
            }
          },
          {
            text: '이 이미지에서 보이는 제품의 이름, 브랜드, 카테고리, 텍스트(라벨/로고)를 분석해줘. JSON으로 응답해줘: {"productName": "...", "brand": "...", "labels": ["..."], "logos": ["..."]}'
          }
        ]
      }],
      generationConfig: {
        responseModalities: ['TEXT']
      }
    })
  });

  if (!response.ok) {
    throw new Error('이미지 분석 실패');
  }

  const data = await response.json();
  const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    let cleanText = textResult.trim();
    if (cleanText.includes('```json')) {
      const start = cleanText.indexOf('```json') + 7;
      const end = cleanText.lastIndexOf('```');
      if (end > start) cleanText = cleanText.substring(start, end).trim();
    } else if (cleanText.includes('```')) {
      const start = cleanText.indexOf('```') + 3;
      const end = cleanText.lastIndexOf('```');
      if (end > start) cleanText = cleanText.substring(start, end).trim();
    }
    const parsed = JSON.parse(cleanText);
    return {
      productName: parsed.productName || '',
      labels: parsed.labels || [],
      logos: parsed.logos || [],
      text: ''
    };
  } catch {
    return { productName: '', labels: [], logos: [], text: '' };
  }
};

// ========================================
// 9. 상품 정보 검색 (Gemini 기반)
// ========================================

export const searchProductInfo = async (productName: string): Promise<{ description: string; targetAudience: string }> => {
  const apiKey = getNanoBananaApiKey();
  
  const prompt = `
"${productName}" 제품에 대한 정보를 검색하고 분석해서 아래 형식으로 정리해줘.

**주요 특징:**
- (핵심 기능과 효과 3-5가지)

**제품 사양:**
- 용량, 주요 성분, 피부 타입 등

**사용 방법:**
(구체적인 사용 방법)

**장점:**
- (구매해야 하는 이유 2-3가지)

중요: 모든 텍스트를 한글로만 작성해.`;

  try {
    const response = await fetch(
      `https://vip.apiyi.com/v1beta/models/${TEXT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        })
      }
    );

    if (!response.ok) {
      throw new Error('상품 정보 검색 실패');
    }

    const data = await response.json();
    const formattedResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // 타겟 고객 추출
    const targetPrompt = `"${productName}" 제품의 타겟 고객층을 한 문장으로 설명해줘. 한글로만 작성.`;
    const targetResponse = await fetch(
      `https://vip.apiyi.com/v1beta/models/${TEXT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: targetPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        })
      }
    );

    const targetData = await targetResponse.json();
    const targetResult = targetData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      description: formattedResult.trim(),
      targetAudience: targetResult.trim()
    };
  } catch (e: any) {
    console.error("제품 검색 실패:", e);
    throw new Error("검색 결과가 없습니다.");
  }
};

// ========================================
// 10. 파일 내용 분석 (Gemini 기반)
// ========================================

export const analyzeFileContent = async (text: string): Promise<{ description: string; targetAudience: string }> => {
  const apiKey = getNanoBananaApiKey();
  
  const prompt = `
아래 제품 정보 파일 내용을 분석해서 정리해줘:

${text}

위 내용을 바탕으로 아래 형식으로 정리해줘:

**주요 특징:**
- (핵심 기능과 효과 3-5가지)

**제품 사양:**
- 용량, 주요 성분, 피부 타입 등

**사용 방법:**
(구체적인 사용 방법)

**장점:**
- (구매해야 하는 이유 2-3가지)

중요: 모든 텍스트를 한글로만 작성해.`;

  try {
    const response = await fetch(
      `https://vip.apiyi.com/v1beta/models/${TEXT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        })
      }
    );

    if (!response.ok) {
      throw new Error('파일 분석 실패');
    }

    const data = await response.json();
    const formattedResult = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // 타겟 고객 추출
    const targetPrompt = `위 제품 정보를 바탕으로 타겟 고객층을 한 문장으로 설명해줘. 한글로만 작성.`;
    const targetResponse = await fetch(
      `https://vip.apiyi.com/v1beta/models/${TEXT_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: targetPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
        })
      }
    );

    const targetData = await targetResponse.json();
    const targetResult = targetData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      description: formattedResult.trim(),
      targetAudience: targetResult.trim()
    };
  } catch (e: any) {
    console.error("파일 분석 실패:", e);
    throw new Error("파일 분석에 실패했습니다.");
  }
};
// ============================================
// 11. 이미지 편집
// ============================================

export async function editProductImage(imageUrl: string, prompt: string): Promise<string> {
  const apiKey = getNanoBananaApiKey();
  
  let imageBase64 = imageUrl;
  if (imageUrl.startsWith('http')) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    imageBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
  
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  const editResponse = await fetch(
    'https://vip.apiyi.com/v1beta/models/gemini-3-pro-image-preview-4k:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: `이 이미지를 다음 지시에 따라 수정해주세요: ${prompt}` },
            { inline_data: { mime_type: 'image/jpeg', data: base64Data } }
          ]
        }],
        generationConfig: { responseModalities: ['IMAGE'], resolution: '4K', aspectRatio: '16:9' }
      })
    }
  );
  
  const editData = await editResponse.json();
  const imagePart = editData.candidates?.[0]?.content?.parts?.find(
    (part: { inlineData?: { mimeType: string; data: string }; inline_data?: { mime_type: string; data: string } }) =>
      part.inlineData || part.inline_data
  );
  
  const inlineData = imagePart?.inlineData || imagePart?.inline_data;
  if (!inlineData?.data) {
    throw new Error('이미지 편집 실패');
  }
  
  const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
  return `data:${mimeType};base64,${inlineData.data}`;
}

