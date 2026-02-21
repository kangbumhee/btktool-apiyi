import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { DetailSection, ProductData, GeneratedDetailPage, SalesLogicType } from '../types';
import { regenerateSection } from '../services/geminiService';
import { getTheme, getTextStyle, CategoryTheme, TextStyleConfig } from '../services/categoryThemes';

interface DetailPagePreviewProps {
  generatedPage: GeneratedDetailPage;
  productData: ProductData;
  onSectionUpdate: (sectionId: string, newImageUrl: string) => void;
  onReset: () => void;
  onSave?: () => void;  // 추가
}

const LOGIC_LABELS: Record<SalesLogicType, { emoji: string; label: string; color: string }> = {
  hook: { emoji: '🎯', label: '후킹', color: 'bg-red-100 text-red-700' },
  solution: { emoji: '💡', label: '솔루션', color: 'bg-blue-100 text-blue-700' },
  clarity: { emoji: '📏', label: '스펙', color: 'bg-green-100 text-green-700' },
  socialProof: { emoji: '⭐', label: '리뷰', color: 'bg-yellow-100 text-yellow-700' },
  service: { emoji: '🎁', label: '활용법', color: 'bg-purple-100 text-purple-700' },
  riskReversal: { emoji: '🛡️', label: '신뢰', color: 'bg-slate-100 text-slate-700' },
  brandStory: { emoji: '📖', label: '스토리', color: 'bg-pink-100 text-pink-700' },
  comparison: { emoji: '⚖️', label: '비교', color: 'bg-orange-100 text-orange-700' },
};

export const DetailPagePreview: React.FC<DetailPagePreviewProps> = ({
  generatedPage,
  productData,
  onSectionUpdate,
  onReset,
  onSave
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { sections, thumbnail } = generatedPage;
  const theme = getTheme(productData.category || '기타');

  const handleDownloadAll = async () => {
    if (!previewRef.current) return;
    
    try {
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff'
      });
      
      const url = canvas.toDataURL('image/jpeg', 0.9);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productData.name}_상세페이지.jpg`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  const handleRegenerate = async (section: DetailSection) => {
    onSectionUpdate(section.id, ''); // 로딩 상태
    try {
      const newUrl = await regenerateSection(section, productData);
      onSectionUpdate(section.id, newUrl);
    } catch (error) {
      console.error('Regeneration failed:', error);
      alert('재생성에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-[1400px] mx-auto">
      
      {/* 왼쪽: 컨트롤 패널 */}
      <div className="w-full lg:w-[320px] lg:sticky lg:top-8 space-y-4">
        
        {/* 상품 정보 */}
        <div className="bg-white p-4 rounded-xl shadow-lg border">
          <h2 className="font-bold text-lg mb-2">{productData.name}</h2>
          <div className="flex gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {productData.category || '미지정'}
            </span>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              {sections.length}장 구성
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {productData.price.toLocaleString()}원
          </p>
        </div>

        {/* 썸네일 */}
        {thumbnail && (
          <div className="bg-white p-4 rounded-xl shadow-lg border">
            <h3 className="font-bold mb-2">🖼️ 대표 이미지</h3>
            <img 
              src={thumbnail.imageUrl} 
              alt="썸네일" 
              className="w-full aspect-square object-cover rounded-lg"
            />
            <button 
              onClick={async () => {
                if (!thumbnail?.imageUrl) return;
                try {
                  const response = await fetch(thumbnail.imageUrl);
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `thumbnail_${Date.now()}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('썸네일 다운로드 실패:', error);
                  // 직접 링크 열기 fallback
                  window.open(thumbnail.imageUrl, '_blank');
                }
              }}
              className="w-full mt-2 py-2 text-sm bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              📥 다운로드
            </button>
          </div>
        )}

        {/* 섹션 목록 */}
        <div className="bg-white p-4 rounded-xl shadow-lg border">
          <h3 className="font-bold mb-3">📑 섹션 구성</h3>
          <div className="space-y-2">
            {sections.map((section, idx) => {
              const logic = LOGIC_LABELS[section.logicType];
              return (
                <div 
                  key={section.id}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                >
                  <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${logic.color}`}>
                    {logic.emoji} {logic.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-2">
          <button 
            onClick={handleDownloadAll}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg"
          >
            🖼️ 전체 JPG 다운로드
          </button>
          {/* 저장 버튼 */}
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg"
            >
              <span>💾</span>
              <span>히스토리에 저장</span>
            </button>
          )}
          <button 
            onClick={onReset}
            className="w-full py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300"
          >
            처음으로
          </button>
        </div>
      </div>

      {/* 오른쪽: 상세페이지 미리보기 */}
      <div className="flex-1">
        <div 
          ref={previewRef}
          className="bg-white shadow-2xl max-w-[600px] mx-auto"
        >
          {sections.map((section, idx) => {
            const textStyle = getTextStyle(section.logicType);
            
            return (
              <div key={section.id} className="relative group overflow-hidden">
                {/* 섹션 라벨 */}
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${LOGIC_LABELS[section.logicType].color}`}>
                    {idx + 1}. {LOGIC_LABELS[section.logicType].label}
                  </span>
                </div>

                {/* 재생성 버튼 */}
                {!section.isGenerating && (
                  <button
                    onClick={() => handleRegenerate(section)}
                    className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-black/80"
                  >
                    🔄 다시 생성
                  </button>
                )}

                {/* 이미지 */}
                {section.imageUrl ? (
                  <>
                    <img 
                      src={section.imageUrl} 
                      alt={section.title}
                      className="w-full h-auto"
                    />
                    
                    {/* 텍스트 오버레이 - SalesLogicType별 스타일 적용 */}
                    {(section.keyMessage || section.subMessage) && (
                      <div 
                        className={`absolute inset-0 flex flex-col pointer-events-none
                          ${textStyle.verticalPosition === 'top' ? 'justify-start' : ''}
                          ${textStyle.verticalPosition === 'center' ? 'justify-center' : ''}
                          ${textStyle.verticalPosition === 'bottom' ? 'justify-end' : ''}
                          ${textStyle.alignment === 'left' ? 'items-start text-left' : ''}
                          ${textStyle.alignment === 'center' ? 'items-center text-center' : ''}
                          ${textStyle.alignment === 'right' ? 'items-end text-right' : ''}
                          ${theme.overlayGradient}
                        `}
                      >
                        <div className={`${textStyle.padding} max-w-4xl w-full`}>
                          {/* 배지 */}
                          {textStyle.showBadge && (
                            <span className={`inline-block px-3 py-1 mb-4 ${theme.badgeStyle}`}>
                              {textStyle.badgeText || section.title}
                            </span>
                          )}
                          
                          {/* 메인 메시지 */}
                          {section.keyMessage && (
                            <h2 
                              className={`
                                ${textStyle.mainSize}
                                ${textStyle.mainWeight}
                                ${textStyle.mainStyle}
                                ${textStyle.mainSpacing}
                                leading-tight
                                ${section.textStyle === 'light' 
                                  ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]' 
                                  : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                                }
                                ${textStyle.decoration || ''}
                              `}
                              style={{ wordBreak: 'keep-all' }}
                            >
                              {section.keyMessage}
                            </h2>
                          )}
                          
                          {/* 서브 메시지 */}
                          {section.subMessage && (
                            <p 
                              className={`
                                ${textStyle.gap}
                                ${textStyle.subSize}
                                ${textStyle.subWeight}
                                ${textStyle.subStyle}
                                ${section.textStyle === 'light' 
                                  ? 'text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]' 
                                  : 'text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'
                                }
                              `}
                            >
                              {section.subMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : section.isGenerating ? (
                  <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-400">이미지 생성 실패</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
