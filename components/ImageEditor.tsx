import React, { useState } from 'react';
import { Button } from './Button';
import { editProductImage } from '../services/geminiService';

interface ImageEditorProps {
  currentImage: string;
  onImageUpdate: (newImage: string) => void;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({ currentImage, onImageUpdate }) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = async () => {
    if (!prompt.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const newImage = await editProductImage(currentImage, prompt);
      onImageUpdate(newImage);
      setPrompt(''); // Clear prompt on success
    } catch (err) {
      console.error(err);
      setError("이미지 수정 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-6">
      <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
        </svg>
        AI 이미지 매직 에디터
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        원하는 스타일이나 배경 변경 내용을 입력하세요.
      </p>
      
      <div className="flex flex-col gap-3">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 배경을 고급스러운 대리석으로 변경"
          className="w-full px-4 py-2 border border-slate-700 bg-slate-800 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-400"
          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
        />
        <Button 
          onClick={handleEdit} 
          isLoading={isProcessing}
          disabled={!prompt.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 shadow-purple-500/30"
        >
          ✨ 수정하기
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};