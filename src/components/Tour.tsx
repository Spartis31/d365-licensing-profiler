import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export type TourTab = 'setup' | 'profiles' | 'selection' | 'results';

interface TourStep {
  id: string;
  tab?: TourTab;
  /** Matches a `data-tour` attribute; a step without one is centred on screen. */
  anchor?: string;
}

/**
 * Deliberately covers the customer-facing path only: features reserved for
 * Microsoft employees are out of scope for a tutorial shown to everyone.
 */
const STEPS: TourStep[] = [
  { id: 'welcome' },
  { id: 'meta', tab: 'setup', anchor: 'setup-meta' },
  { id: 'mode', tab: 'setup', anchor: 'setup-mode' },
  { id: 'entities', tab: 'setup', anchor: 'setup-entities' },
  { id: 'profiles', tab: 'profiles', anchor: 'profiles-card' },
  { id: 'selection', tab: 'selection', anchor: 'selection-table' },
  { id: 'results', tab: 'results', anchor: 'results-summary' },
  { id: 'share', anchor: 'header-excel' },
  { id: 'done' },
];

const MARGIN = 14;
const BUBBLE_WIDTH = 340;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function Tour({ onNavigate, onClose }: { onNavigate: (tab: TourTab) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubbleHeight, setBubbleHeight] = useState(220);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const measure = useCallback(() => {
    if (!step.anchor) {
      setRect(null);
      return;
    }
    const node = document.querySelector(`[data-tour="${step.anchor}"]`);
    if (!node) {
      setRect(null);
      return;
    }
    const box = node.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [step.anchor]);

  useEffect(() => {
    if (step.tab) onNavigate(step.tab);
  }, [step.tab, onNavigate]);

  // The tab switch renders first, so the anchor is only measurable on the next frame.
  useLayoutEffect(() => {
    const timer = window.setTimeout(() => {
      if (step.anchor) {
        document
          .querySelector(`[data-tour="${step.anchor}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      window.setTimeout(measure, 260);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [index, measure, step.anchor]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  useLayoutEffect(() => {
    const height = bubbleRef.current?.offsetHeight;
    if (height && height !== bubbleHeight) setBubbleHeight(height);
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(value + 1, STEPS.length - 1));
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(value - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const bubble: React.CSSProperties = { width: BUBBLE_WIDTH };
  if (rect) {
    const below = rect.top + rect.height + MARGIN;
    const fitsBelow = below + bubbleHeight + MARGIN <= window.innerHeight;
    bubble.top = fitsBelow ? below : rect.top - bubbleHeight - MARGIN;
    bubble.left = Math.min(
      Math.max(MARGIN, rect.left + rect.width / 2 - BUBBLE_WIDTH / 2),
      window.innerWidth - BUBBLE_WIDTH - MARGIN,
    );
  } else {
    bubble.top = window.innerHeight / 2 - bubbleHeight / 2;
    bubble.left = Math.max(MARGIN, window.innerWidth / 2 - BUBBLE_WIDTH / 2);
  }
  // A tall step must never push the buttons off screen.
  bubble.top = Math.max(MARGIN, Math.min(Number(bubble.top), window.innerHeight - bubbleHeight - MARGIN));

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={t('tour.title')}>
      {rect ? (
        <div
          className="tour-spot"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      ) : (
        <div className="tour-veil" />
      )}

      <div className="tour-bubble" ref={bubbleRef} style={bubble}>
        <p className="tour-count">{t('tour.stepOf', { current: index + 1, total: STEPS.length })}</p>
        <h3>{t(`tour.steps.${step.id}.title`)}</h3>
        <p className="tour-body">{t(`tour.steps.${step.id}.body`)}</p>
        <div className="tour-actions">
          <button type="button" className="link" onClick={onClose}>
            {t('tour.close')}
          </button>
          <span className="spacer" />
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            {t('tour.previous')}
          </button>
          <button type="button" className="primary" onClick={() => (last ? onClose() : setIndex(index + 1))}>
            {last ? t('tour.finish') : t('tour.next')}
          </button>
        </div>
      </div>
    </div>
  );
}
