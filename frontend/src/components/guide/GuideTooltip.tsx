import type { TooltipRenderProps } from 'react-joyride';

export const GuideTooltip = ({
  backProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) => {
  const { content, styles = {}, title } = step;
  const safeStyles = styles as Record<string, React.CSSProperties>;
  const backLabel = backProps.title ?? 'הקודם';
  const primaryLabel = primaryProps.title ?? (isLastStep ? 'סיום' : 'הבא');
  const skipLabel = skipProps.title ?? 'דלג';
  const tooltipStyle = {
    ...(safeStyles.tooltip ?? {}),
    backgroundColor: safeStyles.tooltip?.backgroundColor ?? '#fff',
    borderRadius: safeStyles.tooltip?.borderRadius ?? 8,
    boxShadow: safeStyles.tooltip?.boxShadow ?? '0 8px 24px rgba(0, 0, 0, 0.2)',
    boxSizing: 'border-box' as const,
    color: safeStyles.tooltip?.color ?? '#1f2937',
    maxHeight: 'calc(100vh - 24px)',
    maxWidth: 'calc(100vw - 24px)',
    overflowY: 'auto' as const,
    padding: safeStyles.tooltip?.padding ?? 16,
    textAlign: 'right' as const,
    width: step.width ?? 340,
  };

  return (
    <div {...tooltipProps} dir="rtl" style={tooltipStyle}>
      <div style={safeStyles.tooltipContainer ?? {}}>
        {title && (
          <h4 id="joyride-tooltip-title" style={safeStyles.tooltipTitle ?? {}}>
            {title}
          </h4>
        )}
        <div id="joyride-tooltip-content" style={safeStyles.tooltipContent ?? {}}>
          {content}
        </div>
      </div>
      <div
        aria-live="polite"
        style={{
          color: '#64748b',
          fontSize: 12,
          margin: '12px 16px 0',
          textAlign: 'right',
        }}
      >
        הסבר {index + 1} מתוך {size}
      </div>
      <div style={{ ...(safeStyles.tooltipFooter ?? {}), direction: 'rtl' }}>
        <div style={safeStyles.tooltipFooterSpacer ?? {}}>
          <button
            data-testid="button-skip"
            style={safeStyles.buttonSkip ?? { cursor: 'pointer' }}
            type="button"
            {...skipProps}
          >
            {skipLabel}
          </button>
        </div>
        <button
          data-testid="button-back"
          style={safeStyles.buttonBack ?? { cursor: index > 0 ? 'pointer' : 'default' }}
          type="button"
          {...backProps}
          disabled={index === 0}
          aria-disabled={index === 0}
        >
          {backLabel}
        </button>
        <button
          data-testid="button-primary"
          style={safeStyles.buttonPrimary ?? {}}
          type="button"
          {...primaryProps}
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  );
};
