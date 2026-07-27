import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { colors, spacing } from '@/theme/colors';
import { alarmsApi } from '@/services/alarms';
import { AlarmChallenge } from '@/types';
import { detectObject } from '@/services/objectDetection';

type Phase = 'loading' | 'requesting-camera' | 'scanning' | 'validating' | 'success' | 'camera-denied';

export default function AlarmChallengeScreen() {
  const { alarmId } = useParams<{ alarmId: string }>();
  const navigate = useNavigate();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<AlarmChallenge | null | undefined>(null);
  const [hasFreeSkip, setHasFreeSkip] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!alarmId) return;
    (async () => {
      const result = await alarmsApi.trigger(alarmId);
      setAttemptId(result.attemptId);
      setChallenge(result.challenge);
      setHasFreeSkip(result.hasFreeSkipAvailable);
      setSecondsLeft(result.challenge?.validationTimeoutSeconds ?? 60);
      setPhase('requesting-camera');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase('scanning');
      } catch (error) {
        setPhase('camera-denied');
      }
    })();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [alarmId]);

  useEffect(() => {
    if (phase !== 'scanning' || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, secondsLeft]);

  const handleCapture = async () => {
    if (!videoRef.current || !challenge || !attemptId || !alarmId) return;
    setPhase('validating');
    setMessage(null);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const frameDataUrl = canvas.toDataURL('image/jpeg', 0.6);

      const detection = await detectObject(frameDataUrl, challenge.itemType);

      const result = await alarmsApi.validate(alarmId, {
        attemptId,
        detectedLabel: detection.label,
        confidence: detection.confidence,
        boundingBoxAreaRatio: detection.boundingBoxAreaRatio,
      });

      if (result.success) {
        setPhase('success');
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setTimeout(() => navigate('/'), 1200);
      } else {
        setPhase('scanning');
        setMessage(`We couldn't confirm the ${challenge.itemLabel}. Try again.`);
      }
    } catch (error) {
      setPhase('scanning');
      setMessage('Validation error. Please try again.');
    }
  };

  const handleSkip = async () => {
    if (!attemptId || !alarmId || !challenge) return;
    const priceLabel = hasFreeSkip ? 'a free skip' : `$${challenge.skipPrice.toFixed(2)}`;
    if (!window.confirm(`Skip this challenge? This will use ${priceLabel}.`)) return;
    await alarmsApi.skipItem(alarmId, attemptId);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    navigate('/');
  };

  if (phase === 'loading' || phase === 'requesting-camera' || !challenge) {
    return (
      <div style={centerStyle}>
        <h2 style={{ color: colors.textPrimary }}>Preparing your challenge…</h2>
      </div>
    );
  }

  if (phase === 'camera-denied') {
    return (
      <div style={centerStyle}>
        <h2 style={{ color: colors.textPrimary }}>Camera access required</h2>
        <p style={{ color: colors.textSecondary, textAlign: 'center' }}>
          AlarmLock needs the front camera to validate your challenge. Enable it in your browser settings and reload.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing.lg,
          background: 'rgba(11,11,18,0.85)',
          textAlign: 'center',
        }}
      >
        <div style={{ color: colors.textSecondary, fontSize: 16 }}>Show your</div>
        <div style={{ color: colors.textPrimary, fontSize: 40, fontWeight: 800, margin: `${spacing.xs}px 0` }}>
          {challenge.itemLabel}
        </div>
        <div style={{ color: colors.accent, fontSize: 14, marginBottom: spacing.md }}>{secondsLeft}s left</div>

        {phase === 'success' && (
          <div style={{ color: colors.success, fontSize: 18, fontWeight: 700, marginBottom: spacing.md }}>
            ✓ Validated — alarm silenced
          </div>
        )}
        {message && <div style={{ color: colors.warning, marginBottom: spacing.sm }}>{message}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <button onClick={handleCapture} disabled={phase === 'validating'} style={captureButtonStyle}>
            {phase === 'validating' ? 'Checking…' : 'Capture'}
          </button>
          <button onClick={handleSkip} style={skipButtonStyle}>
            {hasFreeSkip ? 'Use free skip' : `Skip ($${challenge.skipPrice.toFixed(2)})`}
          </button>
        </div>
      </div>
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.lg,
  background: colors.background,
  gap: spacing.sm,
};

const captureButtonStyle: React.CSSProperties = {
  background: colors.primary,
  border: 'none',
  borderRadius: 999,
  padding: spacing.md,
  color: colors.textPrimary,
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
};

const skipButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  borderRadius: 999,
  padding: spacing.md,
  color: colors.textSecondary,
  fontWeight: 600,
  cursor: 'pointer',
};
