/**
 * StageCelebration Component
 * 스테이지 해금 시 축하 애니메이션
 *
 * 연출:
 * 1. 쌓인 이모티콘들이 잠깐 떠오름
 * 2. 카테고리 색의 빛과 파티클이 모임
 * 3. 스테이지 공간이 넓어지는 효과
 * 4. 새 이름/장면 등장
 * 약 2초 내외, 건너뛰기 가능, 움직임 축소 지원
 */

import { useEffect, useState, useCallback } from 'react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { CATEGORIES } from '@/domain/categories';
import { useStageStore } from '@/stores/stageStore';
import { prefersReducedMotion } from '@/domain/stages';
import { getSkinRewardForStage } from '@/domain/tree-skins';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

export function StageCelebration() {
  const activeCelebration = useStageStore(state => state.activeCelebration);
  const config = useStageStore(state => state.celebrationConfig);
  const dismissCelebration = useStageStore(state => state.dismissCelebration);
  const setCelebrationConfig = useStageStore(state => state.setCelebrationConfig);

  const [phase, setPhase] = useState<'enter' | 'main' | 'exit'>('enter');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showContent, setShowContent] = useState(false);

  const reducedMotion = config.reducedMotion || prefersReducedMotion();

  const category = activeCelebration
    ? CATEGORIES.find(c => c.key === activeCelebration.categoryKey)
    : null;

  // 스킨 보상 확인
  const skinReward = activeCelebration
    ? getSkinRewardForStage(activeCelebration.categoryKey, activeCelebration.stageNumber)
    : null;

  // 파티클 생성
  const generateParticles = useCallback((color: string) => {
    const count = reducedMotion ? 10 : config.particleCount;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 80, // 중앙 근처에서 시작
        y: 50 + (Math.random() - 0.5) * 80,
        size: 4 + Math.random() * 8,
        color,
        delay: Math.random() * 300,
        duration: 800 + Math.random() * 400
      });
    }

    return newParticles;
  }, [config.particleCount, reducedMotion]);

  // 애니메이션 시퀀스
  useEffect(() => {
    if (!activeCelebration || !category) return;

    // Phase 1: Enter (파티클 생성)
    setPhase('enter');
    setParticles(generateParticles(category.color));

    // Phase 2: Main (콘텐츠 표시)
    const mainTimer = setTimeout(() => {
      setPhase('main');
      setShowContent(true);
    }, reducedMotion ? 100 : 400);

    // Phase 3: Exit (자동 종료)
    const exitTimer = setTimeout(() => {
      setPhase('exit');
    }, reducedMotion ? config.duration / 2 : config.duration - 500);

    // 완전 종료
    const closeTimer = setTimeout(() => {
      dismissCelebration();
    }, config.duration);

    return () => {
      clearTimeout(mainTimer);
      clearTimeout(exitTimer);
      clearTimeout(closeTimer);
    };
  }, [activeCelebration, category, config.duration, generateParticles, reducedMotion, dismissCelebration]);

  // 건너뛰기
  const handleSkip = () => {
    dismissCelebration();
  };

  // 사운드 토글
  const toggleSound = () => {
    setCelebrationConfig({ soundEnabled: !config.soundEnabled });
  };

  if (!activeCelebration || !category) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center
        bg-black/70 backdrop-blur-sm
        transition-opacity duration-300
        ${phase === 'exit' ? 'opacity-0' : 'opacity-100'}
      `}
      onClick={config.skipEnabled ? handleSkip : undefined}
    >
      {/* 파티클 */}
      {!reducedMotion && (
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
      )}

      {/* 중앙 빛 효과 */}
      {!reducedMotion && (
        <div
          className="absolute w-64 h-64 rounded-full animate-glow-pulse opacity-50"
          style={{
            background: `radial-gradient(circle, ${category.color}80, transparent 70%)`,
            filter: 'blur(40px)'
          }}
        />
      )}

      {/* 메인 콘텐츠 */}
      <div
        className={`
          relative z-10 flex flex-col items-center p-8 rounded-2xl
          bg-bg-card/95 backdrop-blur-md border border-border
          max-w-sm w-full mx-4
          transition-all duration-500
          ${showContent ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* 이모티콘 (떠오르는 효과) */}
        <div
          className={`
            text-6xl mb-4
            ${!reducedMotion ? 'animate-float-up' : ''}
          `}
        >
          {category.emoji}
        </div>

        {/* 스테이지 배지 */}
        <div
          className="px-4 py-2 rounded-full text-white font-bold mb-4"
          style={{ background: category.color }}
        >
          Stage {activeCelebration.stageNumber}
        </div>

        {/* 스테이지 이름 */}
        <h2
          className={`
            text-2xl font-bold text-text mb-2 text-center
            ${!reducedMotion ? 'animate-fade-in-up' : ''}
          `}
          style={{ animationDelay: '200ms' }}
        >
          {activeCelebration.stageName}
        </h2>

        {/* 설명 */}
        {activeCelebration.stageDescription && (
          <p
            className={`
              text-text-muted text-center mb-4
              ${!reducedMotion ? 'animate-fade-in-up' : ''}
            `}
            style={{ animationDelay: '400ms' }}
          >
            {activeCelebration.stageDescription}
          </p>
        )}

        {/* 축하 메시지 */}
        <div
          className={`
            flex items-center gap-2 text-gold font-medium
            ${!reducedMotion ? 'animate-fade-in-up' : ''}
          `}
          style={{ animationDelay: '600ms' }}
        >
          <span>🎉</span>
          <span>새로운 단계에 도달했습니다!</span>
          <span>🎉</span>
        </div>

        {/* 스킨 보상 */}
        {skinReward && (
          <div
            className={`
              mt-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20
              border border-purple-500/30 w-full
              ${!reducedMotion ? 'animate-fade-in-up' : ''}
            `}
            style={{ animationDelay: '800ms' }}
          >
            <p className="text-sm text-purple-300 mb-2 text-center">🎁 새로운 스킨 획득!</p>
            <div className="flex items-center gap-3 justify-center">
              <img
                src={skinReward.image}
                alt={skinReward.name}
                className="w-16 h-16 object-contain"
              />
              <div className="text-left">
                <p className="font-bold text-text">{skinReward.name}</p>
                <p className="text-sm text-text-muted">{skinReward.description}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 컨트롤 버튼 */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* 사운드 토글 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSound();
          }}
          className="p-2 rounded-full bg-bg/50 text-text-muted hover:text-text transition-colors"
          title={config.soundEnabled ? '소리 끄기' : '소리 켜기'}
        >
          {config.soundEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>

        {/* 닫기 버튼 */}
        {config.skipEnabled && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSkip();
            }}
            className="p-2 rounded-full bg-bg/50 text-text-muted hover:text-text transition-colors"
            title="건너뛰기"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 건너뛰기 안내 */}
      {config.skipEnabled && (
        <p className="absolute bottom-4 text-text-muted text-sm">
          화면을 탭하여 건너뛰기
        </p>
      )}
    </div>
  );
}

export default StageCelebration;
