import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { DetailSection, ProductData, GeneratedDetailPage, SalesLogicType } from '../types';
import { editProductImage } from '../services/geminiService';
import { getTheme, getTextStyle } from '../services/categoryThemes';
import { Button } from './Button';

// ============ Props ============
interface DetailPagePreviewProps {
  generatedPage: GeneratedDetailPage;
  productData: ProductData;
  onSectionUpdate: (sectionId: string, newImageUrl: string) => void;
  onReset: () => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSectionReorder?: (fromIndex: number, toIndex: number) => void;
}

// ============ Constants ============
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

// ============ SectionCheckbox ============
const SectionCheckbox: React.FC<{
  sectionId: string;
  label: string;
  hiddenSections: Set<string>;
  onToggle: (id: string) => void;
}> = ({ sectionId, label, hiddenSections, onToggle }) => (
  <div className="flex items-center gap-2 mb-2 p-2 bg-slate-100 rounded-lg">
    <input
      type="checkbox"
      id={`section-${sectionId}`}
      checked={!hiddenSections.has(sectionId)}
      onChange={() => onToggle(sectionId)}
      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
    />
    <label
      htmlFor={`section-${sectionId}`}
      className={`text-sm font-medium cursor-pointer ${hiddenSections.has(sectionId) ? 'text-gray-400 line-through' : 'text-gray-700'}`}
    >
      {label}
    </label>
  </div>
);

// ============ ImageFeedbackControl ============
const ImageFeedbackControl: React.FC<{
  section: DetailSection;
  onUpdate: (sectionId: string, newImageUrl: string) => void;
  onScaleChange?: (sectionId: string, scale: number) => void;
}> = ({ section, onUpdate, onScaleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [imageScale, setImageScale] = useState(100);
  const [editablePrompt, setEditablePrompt] = useState(section.visualPrompt || '');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [translatedPrompt, setTranslatedPrompt] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const handleEdit = async () => {
    if (!prompt.trim() || !section.imageUrl) return;
    setIsLoading(true);
    try {
      const newImage = await editProductImage(section.imageUrl, prompt);
      onUpdate(section.id, newImage);
      setIsOpen(false);
      setPrompt('');
    } catch (e) {
      console.error(e);
      alert('이미지 수정 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      onUpdate(section.id, '');
    } catch (e) {
      console.error(e);
      alert('이미지 재생성 중 오류가 발생했습니다.');
    } finally {
      setIsRegenerating(false);
      setIsOpen(false);
      setIsEditingPrompt(false);
    }
  };

  const handleTranslate = async () => {
    if (!section.visualPrompt) return;
    setIsTranslating(true);
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(section.visualPrompt)}`
      );
      const data = await response.json();
      const translated = data[0].map((item: any) => item[0]).join('');
      setTranslatedPrompt(translated);
    } catch (error) {
      console.error('번역 실패:', error);
      setTranslatedPrompt('번역에 실패했습니다.');
    }
    setIsTranslating(false);
  };

  return (
    <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {!isOpen ? (
        <div className="flex gap-1">
          {/* 수정 버튼 */}
          <button
            onClick={() => setIsOpen(true)}
            className="bg-black/60 text-white px-2 py-1.5 rounded-l-full shadow-lg hover:bg-black/80 transition-all backdrop-blur-sm flex items-center gap-1 text-xs font-bold border border-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            수정
          </button>
          {/* 저장 버튼 */}
          <button
            type="button"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                if (!section.imageUrl) return;
                const corsProxy = 'https://api.allorigins.win/raw?url=';
                let blob;
                if (section.imageUrl.startsWith('data:')) {
                  const response = await fetch(section.imageUrl);
                  blob = await response.blob();
                } else {
                  const proxyUrl = corsProxy + encodeURIComponent(section.imageUrl);
                  const response = await fetch(proxyUrl);
                  blob = await response.blob();
                }
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `section_${section.order}_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                console.error('이미지 저장 실패:', error);
                alert('이미지 저장에 실패했습니다.');
              }
            }}
            className="bg-green-600/80 text-white px-2 py-1.5 shadow-lg hover:bg-green-700 transition-all backdrop-blur-sm flex items-center gap-1 text-xs font-bold border border-white/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            저장
          </button>
          {/* 불러오기 버튼 */}
          <label className="bg-blue-600/80 text-white px-2 py-1.5 shadow-lg hover:bg-blue-700 transition-all backdrop-blur-sm flex items-center gap-1 text-xs font-bold border border-white/20 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            불러오기
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const newImageUrl = event.target?.result as string;
                    if (newImageUrl) onUpdate(section.id, newImageUrl);
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>
          {/* 확대/축소 */}
          <div className="flex items-center gap-1 bg-black/60 rounded-r-full px-2 py-1 backdrop-blur-sm border border-white/20">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newScale = Math.max(50, imageScale - 10);
                setImageScale(newScale);
                onScaleChange?.(section.id, newScale);
              }}
              className="text-white hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              -
            </button>
            <span className="text-white text-xs font-medium min-w-[40px] text-center">
              {imageScale}%
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const newScale = Math.min(150, imageScale + 10);
                setImageScale(newScale);
                onScaleChange?.(section.id, newScale);
              }}
              className="text-white hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-3 rounded-lg shadow-2xl border border-slate-200 w-80 animate-in fade-in zoom-in duration-200 z-40 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              ✨ AI 이미지 수정
            </span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-slate-500 font-medium">사용된 프롬프트:</p>
              <button
                type="button"
                onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {isEditingPrompt ? '취소' : '✏️ 수정'}
              </button>
              <button
                type="button"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50"
              >
                {isTranslating ? '번역 중...' : '🌐 번역'}
              </button>
            </div>

            {isEditingPrompt ? (
              <textarea
                value={editablePrompt}
                onChange={(e) => setEditablePrompt(e.target.value)}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white text-gray-900 resize-none"
                rows={4}
              />
            ) : (
              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg whitespace-pre-wrap">
                {section.visualPrompt || '프롬프트 정보 없음'}
              </p>
            )}

            {translatedPrompt && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-800 font-medium mb-1">🇰🇷 한국어 번역:</p>
                <p className="text-xs text-green-700">{translatedPrompt}</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleRegenerate}
            isLoading={isRegenerating}
            disabled={isRegenerating}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 mb-4"
          >
            🔄 {isEditingPrompt ? '수정된 프롬프트로 재생성' : '다시 생성 (Re-roll)'}
          </Button>

          <div className="border-t border-slate-100 my-2"></div>

          <p className="text-xs text-slate-500 mb-2">🖌️ AI 이미지 편집 요청</p>
          <textarea
            className="w-full text-sm p-2 border border-slate-700 bg-slate-800 text-white rounded mb-2 focus:ring-2 focus:ring-purple-500 outline-none resize-none placeholder-slate-400"
            rows={2}
            placeholder={"현재 이미지를 기반으로 수정할 내용을 입력하세요\n예: 배경을 숲속으로, 조명을 더 밝게"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEdit();
              }
            }}
          />
          <Button
            onClick={handleEdit}
            isLoading={isLoading}
            disabled={!prompt.trim()}
            className="w-full py-1 text-sm h-8 bg-purple-600 hover:bg-purple-700 shadow-purple-500/30"
          >
            수정 실행
          </Button>
        </div>
      )}
    </div>
  );
};

// ============ Main Component ============
export const DetailPagePreview: React.FC<DetailPagePreviewProps> = ({
  generatedPage,
  productData,
  onSectionUpdate,
  onReset,
  onSave,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSectionReorder,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  const { sections, thumbnail } = generatedPage;
  const theme = getTheme(productData.category || '기타');

  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [isSectionControlOpen, setIsSectionControlOpen] = useState(false);
  const [imageScales, setImageScales] = useState<Record<string, number>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const toggleSection = (sectionId: string) => {
    setHiddenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) newSet.delete(sectionId);
      else newSet.add(sectionId);
      return newSet;
    });
  };

  const handleScaleChange = (sectionId: string, scale: number) => {
    setImageScales(prev => ({ ...prev, [sectionId]: scale }));
  };

  const visibleSections = sections.filter(s => !hiddenSections.has(s.id));

  // ---- Download All as JPG ----
  const handleDownloadAll = async () => {
    if (!previewRef.current) return;
    try {
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 2,
        backgroundColor: '#ffffff',
        windowHeight: previewRef.current.scrollHeight,
        height: previewRef.current.scrollHeight,
      });
      const url = canvas.toDataURL('image/jpeg', 0.92);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productData.name || '상세페이지'}_${new Date().toISOString().slice(0, 10)}.jpg`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  // ---- Download ZIP ----
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder('ai_detailpage_images');
    if (!folder) return;

    for (let i = 0; i < visibleSections.length; i++) {
      const section = visibleSections[i];
      if (!section.imageUrl) continue;
      try {
        let blob: Blob;
        if (section.imageUrl.startsWith('data:')) {
          const resp = await fetch(section.imageUrl);
          blob = await resp.blob();
        } else {
          const corsProxy = 'https://api.allorigins.win/raw?url=';
          const resp = await fetch(corsProxy + encodeURIComponent(section.imageUrl));
          blob = await resp.blob();
        }
        const arrayBuf = await blob.arrayBuffer();
        folder.file(`section_${i + 1}_${section.logicType}.png`, arrayBuf);
      } catch (e) {
        console.error(`섹션 ${i + 1} 다운로드 실패:`, e);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${productData.name || 'detailpage'}_images.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---- Copy HTML ----
  const handleCopyHTML = async () => {
    if (!previewRef.current) return;
    try {
      let html = `<div style="max-width:600px;margin:0 auto;font-family:'Malgun Gothic',sans-serif;background:#fff;">`;
      for (const section of visibleSections) {
        if (section.imageUrl) {
          const imgSrc = section.imageUrl.startsWith('data:') ? '' : section.imageUrl;
          if (imgSrc) {
            html += `<div style="text-align:center;margin:0;"><img src="${imgSrc}" style="max-width:100%;height:auto;" /></div>`;
          }
        }
      }
      html += `</div>`;
      await navigator.clipboard.writeText(html);
      alert('HTML이 클립보드에 복사되었습니다!\n쿠팡 HTML 모드에 붙여넣기 하세요.');
    } catch (error) {
      console.error('HTML 복사 실패:', error);
      alert('HTML 복사에 실패했습니다.');
    }
  };

  // ---- Drag & Drop ----
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    onSectionReorder?.(draggedIndex, dropIndex);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  // ---- Regenerate (via parent) ----
  const handleRegenerate = (section: DetailSection) => {
    onSectionUpdate(section.id, '');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start max-w-[1400px] mx-auto">
      {/* ===== Left Sidebar ===== */}
      <div className="w-full lg:w-[360px] lg:sticky lg:top-8 order-2 lg:order-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">편집 도구</h2>
            <button onClick={onReset} className="text-sm text-slate-500 hover:text-red-500 underline">
              처음으로
            </button>
          </div>

          {/* 상품 정보 */}
          <div className="mb-4">
            <h3 className="font-bold text-lg text-slate-800">{productData.name}</h3>
            <div className="flex gap-2 mt-1 mb-1">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {productData.category || '미지정'}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                {sections.length}장 구성
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{productData.price.toLocaleString()}원</p>
          </div>

          {/* 썸네일 */}
          {thumbnail && (
            <div className="mb-4 p-3 bg-slate-50 rounded-xl border">
              <h3 className="font-bold text-sm mb-2">🖼️ 대표 이미지</h3>
              <img src={thumbnail.imageUrl} alt="썸네일" className="w-full aspect-square object-cover rounded-lg" />
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
                  } catch {
                    window.open(thumbnail.imageUrl, '_blank');
                  }
                }}
                className="w-full mt-2 py-2 text-sm bg-slate-200 rounded-lg hover:bg-slate-300"
              >
                📥 다운로드
              </button>
            </div>
          )}

          {/* 섹션 이미지 목록 (드래그 가능) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              생성된 섹션 (총 {sections.length}장)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {sections.map((section, idx) => {
                const logic = LOGIC_LABELS[section.logicType];
                return (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative cursor-move
                      ${hiddenSections.has(section.id) ? 'opacity-30 border-red-300' : 'border-slate-200 hover:border-slate-300'}
                      ${draggedIndex === idx ? 'opacity-50 scale-95' : ''}
                    `}
                  >
                    {section.imageUrl ? (
                      <img src={section.imageUrl} alt={`Section ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                        {section.isGenerating ? '⏳' : '❌'}
                      </div>
                    )}
                    <span className={`absolute top-0 left-0 px-1 text-[10px] font-bold ${logic.color}`}>
                      {idx + 1}. {logic.emoji}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 섹션 표시/숨기기 */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
            <button
              onClick={() => setIsSectionControlOpen(!isSectionControlOpen)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                섹션 표시 설정
              </h4>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 text-slate-400 transition-transform ${isSectionControlOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isSectionControlOpen && (
              <div className="p-4 pt-0 border-t border-slate-100">
                <div className="space-y-1">
                  {sections.map((section, idx) => {
                    const logic = LOGIC_LABELS[section.logicType];
                    return (
                      <SectionCheckbox
                        key={section.id}
                        sectionId={section.id}
                        label={`${idx + 1}. ${logic.emoji} ${logic.label} - ${section.title || section.keyMessage?.slice(0, 20) || ''}`}
                        hiddenSections={hiddenSections}
                        onToggle={toggleSection}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-slate-400 mt-2">체크 해제 시 해당 섹션이 숨겨지고 저장에서 제외됩니다.</p>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-3">
            <Button onClick={handleDownloadZip} variant="secondary" className="w-full text-sm">
              📂 개별 이미지 ZIP 다운로드
            </Button>
            <div className="flex gap-2">
              <Button onClick={handleDownloadAll} className="flex-1 text-sm bg-green-600 hover:bg-green-700">
                🖼️ JPG 저장
              </Button>
              <Button onClick={handleCopyHTML} className="flex-1 text-sm bg-blue-600 hover:bg-blue-700">
                📋 HTML 복사
              </Button>
            </div>
            {onSave && (
              <Button onClick={onSave} className="w-full text-sm bg-purple-600 hover:bg-purple-700">
                💾 히스토리에 저장
              </Button>
            )}

            {/* Undo/Redo */}
            {(onUndo || onRedo) && (
              <div className="hidden sm:flex gap-2 mt-3">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    !canUndo ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-700'
                  }`}
                >
                  ↶ 되돌리기
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    !canRedo ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-700'
                  }`}
                >
                  앞으로 ↷
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Right: Preview ===== */}
      <div className="flex-1 order-1 lg:order-2 bg-white shadow-2xl overflow-hidden max-w-[860px] mx-auto border-x border-slate-200">
        <div ref={previewRef}>
          {visibleSections.map((section, idx) => {
            const textStyle = getTextStyle(section.logicType);
            const scale = imageScales[section.id] || 100;

            return (
              <div
                key={section.id}
                data-section={section.id}
                className="relative group overflow-hidden"
              >
                {/* 섹션 라벨 (호버) */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${LOGIC_LABELS[section.logicType].color}`}>
                    {idx + 1}. {LOGIC_LABELS[section.logicType].label}
                  </span>
                </div>

                {/* 재생성 버튼 (호버) */}
                {!section.isGenerating && section.imageUrl && (
                  <button
                    onClick={() => handleRegenerate(section)}
                    className="absolute bottom-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-bold hover:bg-black/80"
                  >
                    🔄 다시 생성
                  </button>
                )}

                {/* 이미지 편집 컨트롤 (호버) */}
                {section.imageUrl && !section.isGenerating && (
                  <ImageFeedbackControl
                    section={section}
                    onUpdate={onSectionUpdate}
                    onScaleChange={handleScaleChange}
                  />
                )}

                {/* 이미지 */}
                {section.imageUrl ? (
                  <div style={{ transform: `scale(${scale / 100})`, transformOrigin: 'top center' }}>
                    <img
                      src={section.imageUrl}
                      alt={section.title}
                      className="w-full h-auto"
                    />
                    {/* 텍스트 오버레이 */}
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
                          {textStyle.showBadge && (
                            <span className={`inline-block px-3 py-1 mb-4 ${theme.badgeStyle}`}>
                              {textStyle.badgeText || section.title}
                            </span>
                          )}
                          {section.keyMessage && (
                            <h2
                              className={`${textStyle.mainSize} ${textStyle.mainWeight} ${textStyle.mainStyle} ${textStyle.mainSpacing} leading-tight
                                ${section.textStyle === 'light'
                                  ? 'text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]'
                                  : 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'}
                                ${textStyle.decoration || ''}
                              `}
                              style={{ wordBreak: 'keep-all' }}
                            >
                              {section.keyMessage}
                            </h2>
                          )}
                          {section.subMessage && (
                            <p
                              className={`${textStyle.gap} ${textStyle.subSize} ${textStyle.subWeight} ${textStyle.subStyle}
                                ${section.textStyle === 'light'
                                  ? 'text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)]'
                                  : 'text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]'}
                              `}
                            >
                              {section.subMessage}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
