import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { DetailSection, ProductData, GeneratedDetailPage, GeneratedCopy } from '../types';
import { editProductImage, refineCopySection } from '../services/geminiService';
import { Button } from './Button';

// ============ Props ============
interface DetailPagePreviewProps {
  generatedPage: GeneratedDetailPage;
  productData: ProductData;
  copy: GeneratedCopy | null;
  onSectionUpdate: (sectionId: string, newImageUrl: string) => void;
  onReset: () => void;
  onSave?: () => void;
  onCopyUpdate: (sectionKey: keyof GeneratedCopy, newData: any) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSectionReorder?: (fromIndex: number, toIndex: number) => void;
}

// ============ SectionCheckbox ============
const SectionCheckbox: React.FC<{
  sectionId: string;
  label: string;
  hiddenSections: Set<string>;
  onToggle: (id: string) => void;
}> = ({ sectionId, label, hiddenSections, onToggle }) => (
  <div className="flex items-center gap-2 mb-2 p-2 bg-slate-100 rounded-lg">
    <input type="checkbox" id={`section-${sectionId}`} checked={!hiddenSections.has(sectionId)} onChange={() => onToggle(sectionId)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
    <label htmlFor={`section-${sectionId}`} className={`text-sm font-medium cursor-pointer ${hiddenSections.has(sectionId) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{label}</label>
  </div>
);

// ============ SectionEditControl ============
const SectionEditControl: React.FC<{ sectionName: string; onUpdate: (feedback: string) => Promise<void> }> = ({ sectionName, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setIsLoading(true);
    try { await onUpdate(feedback); setIsOpen(false); setFeedback(''); } catch (e) { alert('수정 중 오류가 발생했습니다.'); } finally { setIsLoading(false); }
  };
  return (
    <div className="absolute top-2 right-2 z-30 flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="bg-white/90 p-2 rounded-full shadow-md text-slate-500 hover:text-blue-600 hover:bg-white transition-all border border-slate-200 backdrop-blur-sm" title={`${sectionName} 텍스트 수정`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
      ) : (
        <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-200 w-72 z-40 text-left">
          <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-slate-700">✏️ {sectionName} 텍스트 수정</span><button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button></div>
          <textarea className="w-full text-sm p-2 border border-slate-200 rounded mb-2 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-gray-900 bg-white" rows={3} placeholder="예: 좀 더 감성적인 톤으로, 길이를 짧게" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          <Button onClick={handleSubmit} isLoading={isLoading} disabled={!feedback.trim()} className="w-full py-1 text-sm h-8">AI 수정 요청</Button>
        </div>
      )}
    </div>
  );
};

// ============ ImageFeedbackControl ============
const ImageFeedbackControl: React.FC<{
  section: DetailSection;
  sectionIndex: number;
  onUpdate: (sectionId: string, newImageUrl: string) => void;
  onScaleChange?: (sectionId: string, scale: number) => void;
}> = ({ section, sectionIndex, onUpdate, onScaleChange }) => {
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
      setIsOpen(false);
      setIsEditingPrompt(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!section.visualPrompt) return;
    setIsTranslating(true);
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(section.visualPrompt)}`);
      const data = await response.json();
      const translated = data[0].map((item: any) => item[0]).join('');
      setTranslatedPrompt(translated);
    } catch {
      setTranslatedPrompt('번역에 실패했습니다.');
    }
    setIsTranslating(false);
  };

  return (
    <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      {!isOpen ? (
        <div className="flex gap-1">
          <button onClick={() => setIsOpen(true)} className="bg-black/60 text-white px-2 py-1.5 rounded-l-full shadow-lg hover:bg-black/80 transition-all backdrop-blur-sm flex items-center gap-1 text-xs font-bold border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
            수정
          </button>
          <button type="button" onClick={async (e) => {
            e.preventDefault(); e.stopPropagation();
            try {
              if (!section.imageUrl) return;
              const corsProxy = 'https://api.allorigins.win/raw?url=';
              let blob;
              if (section.imageUrl.startsWith('data:')) { blob = await (await fetch(section.imageUrl)).blob(); }
              else { blob = await (await fetch(corsProxy + encodeURIComponent(section.imageUrl))).blob(); }
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `image_${sectionIndex + 1}_${Date.now()}.png`;
              document.body.appendChild(a); a.click(); document.body.removeChild(a); window.URL.revokeObjectURL(url);
            } catch { alert('이미지 저장에 실패했습니다.'); }
          }} className="bg-green-600/80 text-white px-2 py-1.5 shadow-lg hover:bg-green-700 transition-all backdrop-blur-sm flex items-center gap-1 text-xs font-bold border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            저장
          </button>
          <label className="bg-blue-600/80 text-white px-2 py-1.5 shadow-lg hover:bg-blue-700 transition-all backdrop-blur-sm flex items-center gap-1 text-xs font-bold border border-white/20 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
            불러오기
            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { const reader = new FileReader(); reader.onload = (ev) => { const r = ev.target?.result as string; if (r) onUpdate(section.id, r); }; reader.readAsDataURL(file); }
            }} />
          </label>
          <div className="flex items-center gap-1 bg-black/60 rounded-r-full px-2 py-1 backdrop-blur-sm border border-white/20">
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const ns = Math.max(50, imageScale - 10); setImageScale(ns); onScaleChange?.(section.id, ns); }} className="text-white hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold cursor-pointer">-</button>
            <span className="text-white text-xs font-medium min-w-[40px] text-center">{imageScale}%</span>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const ns = Math.min(150, imageScale + 10); setImageScale(ns); onScaleChange?.(section.id, ns); }} className="text-white hover:bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold cursor-pointer">+</button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-3 rounded-lg shadow-2xl border border-slate-200 w-80 z-40 text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-800">✨ AI 이미지 부분 수정</span>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-slate-500 font-medium">사용된 프롬프트:</p>
              <button type="button" onClick={() => setIsEditingPrompt(!isEditingPrompt)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">{isEditingPrompt ? '취소' : '✏️ 수정'}</button>
              <button type="button" onClick={handleTranslate} disabled={isTranslating} className="text-xs text-green-600 hover:text-green-800 font-medium disabled:opacity-50">{isTranslating ? '번역 중...' : '🌐 번역'}</button>
            </div>
            {isEditingPrompt ? (
              <textarea value={editablePrompt} onChange={(e) => setEditablePrompt(e.target.value)} className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white text-gray-900 resize-none" rows={4} />
            ) : (
              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg whitespace-pre-wrap">{section.visualPrompt || '프롬프트 정보 없음'}</p>
            )}
            {translatedPrompt && (
              <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-800 font-medium mb-1">🇰🇷 한국어 번역:</p>
                <p className="text-xs text-green-700">{translatedPrompt}</p>
              </div>
            )}
          </div>
          <Button onClick={handleRegenerate} isLoading={isRegenerating} disabled={isRegenerating} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 mb-4">
            🔄 {isEditingPrompt ? '수정된 프롬프트로 재생성' : '다시 생성 (Re-roll)'}
          </Button>
          <div className="border-t border-slate-100 my-2"></div>
          <p className="text-xs text-slate-500 mb-2">🖌️ AI 이미지 편집 요청</p>
          <textarea className="w-full text-sm p-2 border border-slate-700 bg-slate-800 text-white rounded mb-2 focus:ring-2 focus:ring-purple-500 outline-none resize-none placeholder-slate-400" rows={2}
            placeholder={"현재 이미지를 기반으로 수정할 내용을 입력하세요\n예: 배경을 숲속으로, 조명을 더 밝게"} value={prompt} onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } }} />
          <Button onClick={handleEdit} isLoading={isLoading} disabled={!prompt.trim()} className="w-full py-1 text-sm h-8 bg-purple-600 hover:bg-purple-700 shadow-purple-500/30">수정 실행</Button>
        </div>
      )}
    </div>
  );
};

// ============ Main Component ============
export const DetailPagePreview: React.FC<DetailPagePreviewProps> = ({
  generatedPage, productData, copy, onSectionUpdate, onReset, onSave, onCopyUpdate,
  onUndo, onRedo, canUndo = false, canRedo = false, onSectionReorder,
}) => {
  const detailPageRef = useRef<HTMLDivElement>(null);
  const { sections, thumbnail } = generatedPage;

  const [hiddenSections, setHiddenSections] = useState<Set<string>>(new Set());
  const [isSectionControlOpen, setIsSectionControlOpen] = useState(false);
  const [imageScales, setImageScales] = useState<Record<string, number>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const toggleSection = (sectionId: string) => {
    setHiddenSections(prev => { const n = new Set(prev); if (n.has(sectionId)) n.delete(sectionId); else n.add(sectionId); return n; });
  };

  const handleScaleChange = (sectionId: string, scale: number) => {
    setImageScales(prev => ({ ...prev, [sectionId]: scale }));
  };

  const price = productData.price || 0;
  const discountRate = productData.discountRate || 0;
  const originalPrice = discountRate > 0 ? Math.floor(price * 100 / (100 - discountRate)) : price;

  const features = copy?.features || [];
  const heroSection = sections[0];
  const featureSections = features.map((_, i) => sections[1 + i]).filter(Boolean);
  const usageSection = sections[1 + features.length];

  const handleCopySectionUpdate = async (key: keyof GeneratedCopy, feedback: string) => {
    try {
      if (!copy) return;
      const refined = await refineCopySection(key, copy[key], feedback);
      if (refined != null) onCopyUpdate(key, refined);
      else alert('텍스트 수정에 실패했습니다.');
    } catch {
      alert('텍스트 수정 중 오류가 발생했습니다.');
    }
  };

  // ---- Download JPG ----
  const handleDownloadFullPage = async () => {
    if (!detailPageRef.current) return;
    try {
      detailPageRef.current.scrollTop = 0;
      const canvas = await html2canvas(detailPageRef.current, {
        useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#ffffff', logging: false,
        windowHeight: detailPageRef.current.scrollHeight, height: detailPageRef.current.scrollHeight,
      });
      const url = canvas.toDataURL('image/jpeg', 0.92);
      const a = document.createElement('a'); a.href = url;
      a.download = `${productData.name || '상세페이지'}_${new Date().toISOString().slice(0, 10)}.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } catch (err) {
      console.error('Screenshot failed', err);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  // ---- Download ZIP ----
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder('ai_detailpage_images');
    if (!folder) return;
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const layoutId = i === 0 ? 'hero' : i <= features.length ? 'features' : 'usage';
      if (!s.imageUrl) continue;
      if (layoutId === 'hero' && hiddenSections.has('hero')) continue;
      if (layoutId === 'features' && hiddenSections.has('features')) continue;
      if (layoutId === 'usage' && hiddenSections.has('usage')) continue;
      try {
        let blob: Blob;
        if (s.imageUrl.startsWith('data:')) blob = await (await fetch(s.imageUrl)).blob();
        else blob = await (await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(s.imageUrl))).blob();
        folder.file(`image_${i + 1}.png`, await blob.arrayBuffer());
      } catch (e) {
        console.error(`섹션 ${i + 1} 다운로드 실패:`, e);
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a'); a.href = url; a.download = 'ai_detailpage_images.zip';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ---- Copy HTML ----
  const handleCopyHTML = async () => {
    const el = detailPageRef.current;
    if (!el) return;
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'html-loading';
    loadingDiv.innerHTML = `<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:99999;color:white;font-size:18px;">HTML 생성 중...</div>`;
    document.body.appendChild(loadingDiv);
    try {
      const cloned = el.cloneNode(true) as HTMLElement;
      ['button', 'input', 'label', 'svg'].forEach(sel => cloned.querySelectorAll(sel).forEach(e => e.remove()));
      let html = `<div style="max-width:600px;margin:0 auto;padding:20px;font-family:'Malgun Gothic',sans-serif;background:#fff;">`;
      const processNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent?.trim();
          return (t && t.length > 2 && !t.includes('수정') && !t.includes('저장') && !t.includes('불러오기') && !t.includes('100%') && !t.includes('번역')) ? t : '';
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const e = node as HTMLElement;
        const tag = e.tagName.toLowerCase();
        if (tag === 'img') {
          const src = e.getAttribute('src');
          return (src && !src.includes('data:')) ? `<div style="text-align:center;margin:20px 0;"><img src="${src}" style="max-width:100%;height:auto;border-radius:8px;" /></div>` : '';
        }
        if (tag === 'h1') { const t = e.textContent?.trim(); return (t && !t.includes('수정')) ? `<h1 style="font-size:28px;font-weight:bold;text-align:center;margin:30px 0 20px;color:#1a1a1a;">${t}</h1>` : ''; }
        if (tag === 'h2') { const t = e.textContent?.trim(); return (t && !t.includes('수정')) ? `<h2 style="font-size:24px;font-weight:bold;text-align:center;margin:25px 0 15px;color:#333;">${t}</h2>` : ''; }
        if (tag === 'p') { const t = e.textContent?.trim(); return (t && t.length > 5 && !t.includes('수정') && !t.includes('저장')) ? `<p style="font-size:16px;line-height:1.8;text-align:center;margin:12px 0;color:#555;">${t}</p>` : ''; }
        if (tag === 'td') { const t = e.textContent?.trim(); return t ? `<td style="padding:12px;border:1px solid #e2e8f0;">${t}</td>` : ''; }
        if (tag === 'tr') { let ch = ''; e.childNodes.forEach(c => { ch += processNode(c); }); return ch ? `<tr>${ch}</tr>` : ''; }
        if (tag === 'table') { let ch = ''; e.childNodes.forEach(c => { ch += processNode(c); }); return ch ? `<table style="width:100%;border-collapse:collapse;">${ch}</table>` : ''; }
        let ch = ''; e.childNodes.forEach(c => { ch += processNode(c); }); return ch;
      };
      html += processNode(cloned) + '</div>';
      await navigator.clipboard.writeText(html);
      alert('HTML이 클립보드에 복사되었습니다!\n쿠팡 HTML 모드에 붙여넣기 하세요.');
    } catch {
      alert('HTML 복사에 실패했습니다.');
    } finally {
      document.getElementById('html-loading')?.remove();
    }
  };

  // ---- Drag ----
  const handleDragStart = (e: React.DragEvent, idx: number) => { setDraggedIndex(idx); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', idx.toString()); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, dropIdx: number) => { e.preventDefault(); if (draggedIndex !== null && draggedIndex !== dropIdx) onSectionReorder?.(draggedIndex, dropIdx); setDraggedIndex(null); };
  const handleDragEnd = () => setDraggedIndex(null);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start max-w-[1400px] mx-auto">
      {/* ===== Sidebar ===== */}
      <div className="w-full lg:w-[360px] lg:sticky lg:top-8 order-2 lg:order-1 space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">편집 도구</h2>
            <button onClick={onReset} className="text-sm text-slate-500 hover:text-red-500 underline">처음으로</button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">생성된 장면들 (총 {sections.length}장)</label>
            <div className="grid grid-cols-3 gap-2">
              {sections.map((section, idx) => {
                const layoutId = idx === 0 ? 'hero' : idx <= features.length ? 'features' : 'usage';
                const isHidden = hiddenSections.has(layoutId);
                return (
                <div key={section.id} draggable onDragStart={(e) => handleDragStart(e, idx)} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, idx)} onDragEnd={handleDragEnd}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all relative cursor-move ${isHidden ? 'opacity-30 border-red-300' : 'border-slate-200 hover:border-slate-300'} ${draggedIndex === idx ? 'opacity-50 scale-95' : ''}`}>
                  {section.imageUrl ? (
                    <img src={section.imageUrl} alt={`Section ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">{section.isGenerating ? '⏳' : '❌'}</div>
                  )}
                </div>
              );})}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
            <button onClick={() => setIsSectionControlOpen(!isSectionControlOpen)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                섹션 표시 설정
              </h4>
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-slate-400 transition-transform ${isSectionControlOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            {isSectionControlOpen && (
              <div className="p-4 pt-0 border-t border-slate-100">
                <div className="space-y-1">
                  <SectionCheckbox sectionId="header" label="상단 인증 배지" hiddenSections={hiddenSections} onToggle={toggleSection} />
                  <SectionCheckbox sectionId="pricing" label="가격 정보" hiddenSections={hiddenSections} onToggle={toggleSection} />
                  <SectionCheckbox sectionId="hero" label="메인 히어로 이미지" hiddenSections={hiddenSections} onToggle={toggleSection} />
                  <SectionCheckbox sectionId="features" label="제품 특징" hiddenSections={hiddenSections} onToggle={toggleSection} />
                  <SectionCheckbox sectionId="usage" label="사용 시나리오" hiddenSections={hiddenSections} onToggle={toggleSection} />
                  <SectionCheckbox sectionId="cta" label="구매 유도 (CTA)" hiddenSections={hiddenSections} onToggle={toggleSection} />
                  <SectionCheckbox sectionId="footer" label="하단 CTA & 저작권" hiddenSections={hiddenSections} onToggle={toggleSection} />
                </div>
                <p className="text-xs text-slate-400 mt-2">체크 해제 시 해당 섹션이 숨겨지고 저장에서 제외됩니다.</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button onClick={handleDownloadZip} variant="secondary" className="w-full text-sm">📂 개별 이미지 ZIP 다운로드</Button>
            <div className="flex gap-2">
              <Button onClick={handleDownloadFullPage} className="flex-1 text-sm bg-green-600 hover:bg-green-700">🖼️ JPG 저장</Button>
              <Button onClick={handleCopyHTML} className="flex-1 text-sm bg-blue-600 hover:bg-blue-700">📋 HTML 복사</Button>
            </div>
            {onSave && <Button onClick={onSave} className="w-full text-sm bg-purple-600 hover:bg-purple-700">💾 히스토리에 저장</Button>}
            {(onUndo || onRedo) && (
              <div className="hidden sm:flex gap-2 mt-3">
                <button onClick={onUndo} disabled={!canUndo} className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${!canUndo ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-700'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                  되돌리기
                </button>
                <button onClick={onRedo} disabled={!canRedo} className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${!canRedo ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-700'}`}>
                  앞으로
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Preview Area ===== */}
      <div className="flex-1 order-1 lg:order-2 bg-white shadow-2xl overflow-hidden max-w-[860px] mx-auto border-x border-slate-200" ref={detailPageRef}>

        {/* 상단 헤더 + 가격 */}
        {!hiddenSections.has('header') && (
          <div className="bg-white border-b border-slate-200 p-6 relative group" data-section="header">
            {!hiddenSections.has('pricing') && (
              <div data-section="pricing" className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                  <h1 className="text-2xl font-medium text-slate-900">{productData.name}</h1>
                  <div className="flex items-end gap-2 mt-2">
                    {discountRate > 0 && <span className="text-red-500 font-bold text-2xl">{discountRate}%</span>}
                    <span className="text-slate-900 font-bold text-3xl">{price.toLocaleString()}원</span>
                    {discountRate > 0 && <span className="text-slate-400 line-through text-sm mb-1">{originalPrice.toLocaleString()}원</span>}
                  </div>
                </div>
                <div className="text-right w-full md:w-auto">
                  <div className="flex items-center gap-1 justify-end text-yellow-400 mb-1">
                    {'★★★★★'.split('').map((s, i) => <span key={i}>{s}</span>)}
                    <span className="text-slate-400 text-sm ml-1">(4.8) 리뷰 1,234개</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 히어로 이미지 */}
        {!hiddenSections.has('hero') && heroSection?.imageUrl && (
          <div data-section="hero" className="relative group">
            {!heroSection.isGenerating && (
              <>
                <ImageFeedbackControl section={heroSection} sectionIndex={0} onUpdate={onSectionUpdate} onScaleChange={handleScaleChange} />
                <div style={{ transform: `scale(${(imageScales[heroSection.id] || 100) / 100})`, transformOrigin: 'top center' }}>
                  <img src={heroSection.imageUrl} alt="" className="w-full h-auto" />
                </div>
              </>
            )}
            {heroSection.isGenerating && (
              <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        )}

        {/* Pain Points */}
        {!hiddenSections.has('features') && copy && copy.painPoints && copy.painPoints.length > 0 && (
          <div className="py-12 px-8 bg-slate-50 relative group" data-section="features">
            <SectionEditControl sectionName="고객 고민" onUpdate={(fb) => handleCopySectionUpdate('painPoints', fb)} />
            <h2 className="text-center text-2xl font-bold text-slate-800 mb-8">이런 고민 있으셨죠?</h2>
            {copy.painPoints.map((point, idx) => (
              <div key={idx} className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
                <span className="text-blue-600 font-bold text-sm">PROBLEM {idx + 1}</span>
                <h3 className="font-bold text-lg text-slate-800 mt-1">{point.title}</h3>
                <p className="text-slate-600 mt-1">{point.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Solution */}
        {!hiddenSections.has('features') && copy && copy.solution && (
          <div className="py-12 px-8 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center relative group">
            <SectionEditControl sectionName="솔루션" onUpdate={(fb) => handleCopySectionUpdate('solution', fb)} />
            <h2 className="text-3xl font-bold mb-4">해결책을 찾았습니다</h2>
            <p className="text-xl text-white/90">{copy.solution}</p>
          </div>
        )}

        {/* Features with images */}
        {!hiddenSections.has('features') && copy && features.map((feature, idx) => {
          const section = featureSections[idx];
          return (
            <div key={idx} className="relative group" data-section="features">
              {section?.imageUrl && !section.isGenerating && (
                <>
                  <ImageFeedbackControl section={section} sectionIndex={idx + 1} onUpdate={onSectionUpdate} onScaleChange={handleScaleChange} />
                  <img src={section.imageUrl} alt="" className="w-full h-auto" />
                </>
              )}
              {section?.isGenerating && (
                <div className="w-full aspect-[9/16] bg-slate-100 flex items-center justify-center">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              )}
              <div className="py-8 px-8">
                <SectionEditControl sectionName={`특징 ${idx + 1}`} onUpdate={(fb) => handleCopySectionUpdate('features', fb)} />
                <span className="text-blue-600 font-bold text-sm">POINT {idx + 1}</span>
                <h3 className="text-xl font-bold text-slate-800 mt-1">{feature.title}</h3>
                <p className="text-sm text-blue-500 mb-2">{feature.subtitle}</p>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            </div>
          );
        })}

        {/* Usage Scenarios */}
        {!hiddenSections.has('usage') && copy && copy.usageScenarios && copy.usageScenarios.length > 0 && (
          <div className="py-12 px-8 relative group" data-section="usage">
            <SectionEditControl sectionName="사용 시나리오" onUpdate={(fb) => handleCopySectionUpdate('usageScenarios', fb)} />
            <h2 className="text-center text-2xl font-bold text-slate-800 mb-8">이렇게 사용하세요</h2>
            {usageSection?.imageUrl && !usageSection.isGenerating && (
              <>
                <ImageFeedbackControl section={usageSection} sectionIndex={1 + features.length} onUpdate={onSectionUpdate} onScaleChange={handleScaleChange} />
                <img src={usageSection.imageUrl} alt="" className="w-full h-auto rounded-xl mb-8" />
              </>
            )}
            {copy.usageScenarios.map((scenario, idx) => (
              <div key={idx} className="mb-4 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-bold text-slate-800">{scenario.situation}</h4>
                <p className="text-slate-600 mt-1">{scenario.benefit}</p>
              </div>
            ))}
          </div>
        )}

        {/* FAQ */}
        {!hiddenSections.has('features') && copy && copy.faq && copy.faq.length > 0 && (
          <div className="py-12 px-8 relative group">
            <SectionEditControl sectionName="FAQ" onUpdate={(fb) => handleCopySectionUpdate('faq', fb)} />
            <h2 className="text-center text-2xl font-bold text-slate-800 mb-8">자주 묻는 질문 (FAQ)</h2>
            {copy.faq.map((item, idx) => (
              <div key={idx} className="mb-4 p-5 bg-white rounded-xl shadow-sm border border-slate-200">
                <p className="font-bold text-slate-800"><span className="text-blue-600 mr-2">Q.</span>{item.question}</p>
                <p className="text-slate-600 mt-2 ml-6"><span className="text-blue-400 mr-2">A.</span>{item.answer}</p>
              </div>
            ))}
          </div>
        )}

        {/* Specs Table */}
        {!hiddenSections.has('features') && copy && copy.specs && copy.specs.length > 0 && (
          <div className="py-12 px-8 relative group">
            <SectionEditControl sectionName="제품 스펙" onUpdate={(fb) => handleCopySectionUpdate('specs', fb)} />
            <h2 className="text-center text-2xl font-bold text-slate-800 mb-8">제품 상세 스펙</h2>
            <table className="w-full border-collapse">
              <tbody>
                {copy.specs.map((spec, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="p-4 font-bold text-slate-700 border border-slate-200 w-1/3 text-center">{spec.label}</td>
                    <td className="p-4 text-slate-600 border border-slate-200">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CTA */}
        {!hiddenSections.has('cta') && (
          <div data-section="cta" className="bg-gradient-to-r from-purple-600 to-blue-600 p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-3">지금 바로 구매하세요!</h2>
            <p className="text-white/80 text-lg mb-6">{productData.promotionText || '한정 수량 특별가로 만나보세요'}</p>
            <div className="inline-block bg-white text-purple-700 font-bold px-8 py-3 rounded-full text-lg shadow-xl">
              {price.toLocaleString()}원{discountRate > 0 && ` (${discountRate}% OFF)`}
            </div>
          </div>
        )}

        {/* Footer */}
        {!hiddenSections.has('footer') && (
          <div data-section="footer" className="bg-slate-50 p-6 text-center border-t">
            <p className="text-slate-400 text-xs">© {new Date().getFullYear()} {productData.name} | AI 상세페이지</p>
          </div>
        )}
      </div>
    </div>
  );
};
