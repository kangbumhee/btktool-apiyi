// services/cloudinaryService.ts

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dy1q51asy';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Cloudinary에 이미지 업로드 (unsigned upload 방식)
 * @param base64Image - base64 인코딩된 이미지 또는 이미지 URL
 * @param folder - 저장할 폴더명 (선택)
 * @returns 업로드된 이미지 URL
 */
export async function uploadToCloudinary(
  base64Image: string,
  folder: string = 'ai-detail-page'
): Promise<string> {
  // 이미 URL이면 그대로 반환
  if (base64Image.startsWith('http')) {
    return base64Image;
  }
  
  // SVG 플레이스홀더면 건너뛰기
  if (base64Image.includes('image/svg+xml')) {
    throw new Error('SVG 이미지는 업로드할 수 없습니다.');
  }
  
  const uploadPreset = 'ai_detail_page'; // Cloudinary unsigned preset
  
  // Base64 데이터를 Blob으로 변환
  let fileData: Blob | string;
  
  if (base64Image.startsWith('data:')) {
    // Base64 문자열인 경우
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    // Base64를 Blob으로 변환
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const mimeType = base64Image.match(/data:image\/(\w+);base64/)?.[1] || 'jpeg';
    fileData = new Blob([byteArray], { type: `image/${mimeType}` });
  } else {
    fileData = base64Image;
  }
  
  const formData = new FormData();
  formData.append('file', fileData);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);
  
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Cloudinary upload failed: ${response.status}`);
    }
    
    const data: CloudinaryResponse = await response.json();
    return data.secure_url;
    
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * 외부 URL에서 이미지를 가져와서 Cloudinary에 업로드
 * @param imageUrl - 외부 이미지 URL
 * @param folder - 저장할 폴더명
 * @returns 업로드된 이미지 URL
 */
export async function uploadExternalImageToCloudinary(
  imageUrl: string,
  folder: string = 'ai-detail-page'
): Promise<string> {
  // 이미 Cloudinary URL이면 그대로 반환
  if (imageUrl.includes('cloudinary.com')) {
    return imageUrl;
  }

  try {
    // 외부 이미지를 가져오기
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }
    
    const blob = await imageResponse.blob();
    
    const uploadPreset = 'ai_detail_page';
    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', folder);
    
    const uploadResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    );
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Cloudinary upload failed');
    }
    
    const data: CloudinaryResponse = await uploadResponse.json();
    console.log('Cloudinary 업로드 성공:', data.secure_url);
    return data.secure_url;
    
  } catch (error) {
    console.error('Cloudinary 업로드 실패, 원본 URL 반환:', error);
    return imageUrl;
  }
}

/**
 * 여러 이미지를 Cloudinary에 업로드
 * @param images - base64 이미지 배열
 * @param folder - 저장할 폴더명
 * @returns 업로드된 이미지 URL 배열
 */
export async function uploadMultipleToCloudinary(
  images: string[],
  folder: string = 'ai-detail-page'
): Promise<string[]> {
  const uploadPromises = images.map(img => uploadToCloudinary(img, folder));
  return Promise.all(uploadPromises);
}

/**
 * Cloudinary 이미지 URL에 변환 옵션 적용
 * @param url - 원본 Cloudinary URL
 * @param options - 변환 옵션
 * @returns 변환된 이미지 URL
 */
export function getTransformedUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  } = {}
): string {
  const { width, height, quality = 'auto', format = 'auto', crop = 'fill' } = options;
  
  // Cloudinary URL이 아니면 그대로 반환
  if (!url.includes('cloudinary.com')) {
    return url;
  }
  
  // Cloudinary URL 구조: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{public_id}
  const transformations: string[] = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop && (width || height)) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  
  if (transformations.length === 0) return url;
  
  const transformString = transformations.join(',');
  
  // URL에 변환 삽입
  return url.replace('/upload/', `/upload/${transformString}/`);
}

/**
 * 상세페이지용 최적화된 이미지 URL 생성
 * @param url - 원본 Cloudinary URL
 * @returns 860px 너비로 최적화된 URL
 */
export function getDetailPageImageUrl(url: string): string {
  return getTransformedUrl(url, {
    width: 860,
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * 썸네일 이미지 URL 생성
 * @param url - 원본 Cloudinary URL
 * @returns 200x200 썸네일 URL
 */
export function getThumbnailUrl(url: string): string {
  return getTransformedUrl(url, {
    width: 200,
    height: 200,
    crop: 'thumb',
    quality: 'auto',
    format: 'auto'
  });
}

/**
 * 쇼피 상품 라벨 이미지 업로드
 * @param base64Image - base64 인코딩된 이미지
 * @returns 업로드된 이미지 URL
 */
export async function uploadProductLabelImage(base64Image: string): Promise<string> {
  return uploadToCloudinary(base64Image, 'shopee-labels');
}

