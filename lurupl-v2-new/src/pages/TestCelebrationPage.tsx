/**
 * TestCelebrationPage - 축하 화면 UI 테스트 페이지
 */

import { useState } from 'react';
import { X, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { getSkinRewardForStage } from '@/domain/tree-skins';
import type { CategoryKey } from '@/domain/categories';

const CATEGORIES = [
  { key: 'exercise' as CategoryKey, emoji: '🏃', name: '운동', color: '#10B981' },
  { key: 'cleaning' as CategoryKey, emoji: '🧹', name: '청소', color: '#3B82F6' },
  { key: 'morning' as CategoryKey, emoji: '⏰', name: '기상', color: '#F59E0B' },
  { key: 'study' as CategoryKey, emoji: '📚', name: '공부', color: '#8B5CF6' },
  { key: 'meditation' as CategoryKey, emoji: '🧘', name: '명상', color: '#EC4899' },
];

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

function generateParticles(color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 30; i++) {
    particles.push({
      id: i,
      x: 50 + (Math.random() - 0.5) * 80,
      y: 50 + (Math.random() - 0.5) * 80,
      size: 4 + Math.random() * 8,
      color,
      delay: Math.random() * 300,
      duration: 800 + Math.random() * 400
    });
  }
  return particles;
}

export function TestCelebrationPage() {
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [stageNumber, setStageNumber] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [particles, setParticles] = useState<Particle[]>([]);

  const handleTrigger = () => {
    setParticles(generateParticles(selectedCategory.color));
    setShowCelebration(true);
  };

  const stageName = stageNumber === 1 ? `아기 ${selectedCategory.name}선수`
    : stageNumber === 3 ? '러너'
    : `${selectedCategory.name} 마스터`;

  return (
    <div className="min-h-screen bg-bg p-8">
      <h1 className="text-2xl font-bold text-text mb-6">축하 화면 UI 테스트</h1>

      {/* 컨트롤 */}
      <div className="bg-bg-card rounded-xl p-6 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-text mb-2">카테고리</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  selectedCategory.key === cat.key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-2">스테이지</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(num => (
              <button
                key={num}
                onClick={() => setStageNumber(num)}
                className={`w-10 h-10 rounded-lg border transition-colors ${
                  stageNumber === num
                    ? 'border-primary bg-primary text-white'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleTrigger}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          축하 화면 보기
        </button>
      </div>

      {/* 축하 화면 */}
      {showCelebration && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCelebration(false)}
        >
          {/* 파티클 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map(particle => (
              <div
                key={particle.id}
                className="absolute rounded-full animate-particle-burst"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: particle.size,
                  height: particle.size,
                  background: particle.color,
                  boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
                  animationDelay: `${particle.delay}ms`,
                  animationDuration: `${particle.duration}ms`
                }}
              />
            ))}
          </div>

          {/* 중앙 빛 효과 */}
          <div
            className="absolute w-64 h-64 rounded-full animate-glow-pulse opacity-50"
            style={{
              background: `radial-gradient(circle, ${selectedCategory.color}80, transparent 70%)`,
              filter: 'blur(40px)'
            }}
          />

          {/* 메인 콘텐츠 */}
          <div
            className="relative z-10 flex flex-col items-center p-6 rounded-2xl bg-bg-card/95 backdrop-blur-md border border-border max-w-sm w-full mx-4 max-h-[85vh] overflow-y-auto animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* 이모티콘 */}
            <div className="text-6xl mb-4 animate-bounce">
              {selectedCategory.emoji}
            </div>

            {/* 스테이지 배지 */}
            <div
              className="px-4 py-2 rounded-full text-white font-bold mb-4"
              style={{ background: selectedCategory.color }}
            >
              Stage {stageNumber}
            </div>

            {/* 스테이지 이름 */}
            <h2 className="text-2xl font-bold text-text mb-2 text-center">
              {stageName}
            </h2>

            {/* 설명 */}
            <p className="text-text-muted text-center mb-4">
              {selectedCategory.name} 습관이 자리잡기 시작했습니다!
            </p>

            {/* 축하 메시지 */}
            <div className="flex items-center gap-2 text-amber-500 font-medium">
              <span>🎉</span>
              <span>새로운 단계에 도달했습니다!</span>
              <span>🎉</span>
            </div>

            {/* 스킨 보상 */}
            {(() => {
              const skinReward = getSkinRewardForStage(selectedCategory.key, stageNumber);
              if (!skinReward) return null;
              return (
                <div className="mt-5 w-full">
                  {/* 헤더 배지 */}
                  <div className="flex justify-center mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-sm font-bold rounded-full shadow-md">
                      <span>🎁</span>
                      <span>새로운 스킨 획득!</span>
                    </span>
                  </div>

                  {/* 스킨 카드 */}
                  <div className="relative p-5 rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-2 border-amber-200 dark:border-amber-500/30 shadow-lg overflow-hidden">
                    {/* 배경 장식 */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full blur-3xl" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400 rounded-full blur-2xl" />
                    </div>

                    <div className="relative flex flex-col items-center gap-4">
                      {/* 스킨 이미지 */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-200 to-orange-200 dark:from-amber-500/20 dark:to-orange-500/20 rounded-2xl blur-xl scale-75" />
                        <div className="relative w-28 h-28 p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-inner border border-gray-100 dark:border-gray-700">
                          <img
                            src={skinReward.image}
                            alt={skinReward.name}
                            className="w-full h-full object-contain drop-shadow-md"
                          />
                        </div>
                      </div>

                      {/* 스킨 정보 */}
                      <div className="text-center">
                        <p className="font-bold text-gray-900 dark:text-white text-lg">{skinReward.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{skinReward.description}</p>
                      </div>

                      {/* 스킨 변경 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCelebration(false);
                          window.location.href = '/result?tab=myinfo';
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                      >
                        지금 적용하기
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 컨트롤 버튼 */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSoundEnabled(!soundEnabled);
              }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCelebration(false);
              }}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 건너뛰기 안내 */}
          <p className="absolute bottom-4 text-white/60 text-sm">
            화면을 탭하여 건너뛰기
          </p>
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes particle-burst {
          0% { transform: scale(0); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: scale(1) translateY(-100px); opacity: 0; }
        }
        @keyframes glow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-scale-in { animation: scale-in 0.4s ease-out; }
        .animate-particle-burst { animation: particle-burst 1s ease-out forwards; }
        .animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default TestCelebrationPage;
