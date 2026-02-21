import React, { useState, useEffect } from 'react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoCloseOnSave?: boolean;
}

const API_KEY_STORAGE_KEY = 'nanoBananaApiKey';

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, autoCloseOnSave = false }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testImage, setTestImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const storedKey = getStoredApiKey();
      if (storedKey) {
        setApiKey(storedKey);
        setIsSaved(true);
      }
      setTestResult(null);
      setTestImage(null);
    }
  }, [isOpen]);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ success: false, message: 'API 키를 입력해주세요.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    setTestImage(null);
    try {
      const url = "https://vip.apiyi.com/v1beta/models/gemini-2.5-flash:generateContent";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey.trim()}`
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "안녕하세요. 테스트입니다. OK라고만 답해주세요." }] }],
          generationConfig: { maxOutputTokens: 10 }
        }),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || `HTTP ${response.status}`;
        if (response.status === 401 || response.status === 403) throw new Error("API 키가 유효하지 않습니다.");
        if (response.status === 429) throw new Error("크레딧이 부족합니다. api.apiyi.com에서 충전해주세요.");
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        setTestResult({ success: true, message: `✅ API 키 정상 작동! 응답: "${text.trim()}"` });
      } else {
        throw new Error("응답을 받지 못했습니다.");
      }
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        setTestResult({ success: false, message: '❌ 시간 초과 (30초). 네트워크를 확인해주세요.' });
      } else {
        setTestResult({ success: false, message: `❌ ${error.message}` });
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
      setIsSaved(true);
    }
    // autoCloseOnSave가 true면 저장 후 모달 닫기
    if (autoCloseOnSave) {
      setTimeout(() => {
        onClose();
      }, 300); // 저장 완료 메시지 표시 후 닫기
    }
  };

  const handleClear = () => {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setIsSaved(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">⚙️ API 설정</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* API 키 입력 섹션 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              🔑 Nano Banana API Key
            </label>
            <div className="relative">
              <input 
                type={showKey ? "text" : "password"}
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 pr-20"
                placeholder="API 키를 입력하세요"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setIsSaved(false);
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
              >
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            {isSaved && (
              <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                ✅ 저장됨
              </p>
            )}
          </div>

          {/* 발급 방법 안내 */}
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
            <h3 className="text-purple-800 font-bold mb-3 flex items-center gap-2">
              📋 API 키 발급 방법
            </h3>
            <ol className="text-purple-700 text-sm space-y-2 list-decimal list-inside">
              <li>
                <a 
                  href="https://api.apiyi.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 underline hover:text-purple-800 font-medium"
                >
                  api.apiyi.com
                </a>
                {" "}사이트에 접속하여 회원가입/로그인
              </li>
              <li>
                <a 
                  href="https://api.apiyi.com/account/pricing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 underline hover:text-purple-800 font-medium"
                >
                  토큰 관리 페이지에서 API Key 생성
                </a>
                {" "}
              </li>
              <li>새 API Key 생성 버튼 클릭</li>
              <li>생성된 키를 복사하여 위에 붙여넣기</li>
            </ol>
          </div>

          {/* 요금 안내 */}
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-800 mb-2">💰 이미지 생성 요금</p>
            <div className="text-xs text-green-700 space-y-1">
              <p>• Nano Banana Pro: 이미지 1장당 <strong>$0.05 (약 68원)</strong></p>
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="font-medium mb-1">📄 상세페이지 예상 비용:</p>
                <p>• 상세페이지 1건 (9~12장): 약 $0.45~$0.60 (약 612~820원)</p>
              </div>
            </div>
          </div>

          {/* 테스트 비용 안내 */}
          <p className="text-xs text-slate-400 mt-2">
            💡 테스트 시 텍스트 모델로 확인하며 비용이 거의 들지 않습니다.
          </p>

          {/* 버튼들 */}
          <div className="flex gap-3">
            <Button 
              onClick={handleSave} 
              disabled={!apiKey.trim() || isSaved}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              저장
            </Button>
            <button
              type="button"
              onClick={handleTest}
              disabled={!apiKey.trim() || isTesting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  테스트 중...
                </>
              ) : (
                <>🧪 테스트</>
              )}
            </button>
            <Button 
              onClick={handleClear} 
              variant="secondary"
              className="flex-1"
            >
              초기화
            </Button>
          </div>

          {testResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-medium ${
                testResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.message}
              </p>
              {testImage && (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={testImage}
                    alt="테스트 이미지"
                    className="w-20 h-20 rounded-lg object-cover border border-green-200 shadow-sm"
                  />
                  <span className="text-xs text-green-600">테스트 생성 이미지</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <Button onClick={onClose} variant="secondary" className="text-sm">
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
};
