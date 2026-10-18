import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserGuideProvider } from '../UserGuideProvider';
import { useUserGuide } from '../UserGuideContext';

vi.mock('react-joyride', () => ({
  Joyride: ({
    onEvent,
    options,
    run,
    steps,
    tooltipComponent,
  }: {
    onEvent?: (event: { status: string }) => void;
    options: { blockTargetInteraction: boolean; skipBeacon: boolean; zIndex: number };
    run: boolean;
    steps: Array<{
      floatingOptions?: { flipOptions?: boolean };
      id?: string;
      placement?: string;
      width?: number;
      target: string | (() => HTMLElement | null);
      title?: string;
    }>;
    tooltipComponent: ComponentType<never>;
  }) => (
    <div
      data-testid="guide-tour"
      data-running={String(run)}
      data-block-target-interaction={String(options.blockTargetInteraction)}
      data-skip-beacon={String(options.skipBeacon)}
      data-step-count={steps.length}
      data-targets={steps.map((step) => step.title ?? step.target).join('|')}
      data-second-step-target={String(steps[1]?.target)}
      data-placements={steps.map((step) => step.placement ?? 'default').join('|')}
      data-horizontal-steps={steps
        .map((step) => step.id?.replace('guide-horizontal-step-', '') ?? null)
        .filter((index) => index !== null)
        .join('|')}
      data-narrow-step-widths={steps
        .map((step, index) => (step.width ? `${index + 1}:${step.width}` : null))
        .filter((width) => width !== null)
        .join('|')}
      data-z-index={options.zIndex}
    >
      {tooltipComponent ? 'custom-tooltip' : null}
      <button onClick={() => onEvent?.({ status: 'finished' })}>סיים סיור מדומה</button>
    </div>
  ),
}));

const GuideControls = () => {
  const { startGuide } = useUserGuide();

  return <button onClick={startGuide}>הפעל מדריך</button>;
};

const renderGuide = (pathname = '/') =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <UserGuideProvider>
        <GuideControls />
      </UserGuideProvider>
    </MemoryRouter>
  );

describe('UserGuideProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens the welcome dialog on the first catalog visit and starts the tour', async () => {
    const user = userEvent.setup();

    renderGuide();

    expect(await screen.findByText('ברוכים הבאים לאתר הוצלא')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'המשך' }));

    expect(screen.getByTestId('guide-tour')).toHaveAttribute('data-running', 'true');
    expect(screen.getByTestId('guide-tour')).toHaveAttribute(
      'data-block-target-interaction',
      'true'
    );
    await waitFor(() => {
      expect((document.querySelector('[data-guide-app-content]') as HTMLDivElement).inert).toBe(
        true
      );
    });
    expect(screen.getByTestId('guide-tour')).toHaveAttribute('data-skip-beacon', 'true');
    expect(screen.getByTestId('guide-tour')).toHaveAttribute('data-z-index', '2000');
    expect(screen.getByTestId('guide-tour')).toHaveAttribute('data-step-count', '19');
    const stepTitles = screen.getByTestId('guide-tour').getAttribute('data-targets') ?? '';
    expect(stepTitles).toContain('עגלת הקניות');
    expect(stepTitles).not.toContain('הלוגואים בתפריט');
    expect(screen.getByTestId('guide-tour')).toHaveAttribute(
      'data-second-step-target',
      '#guide-sidebar-navigation-options'
    );
    const stepPlacements = screen
      .getByTestId('guide-tour')
      .getAttribute('data-placements')
      ?.split('|');
    expect(stepPlacements?.[1]).toBe('left');
    expect(stepPlacements?.[2]).toBe('left');
    expect(stepPlacements?.[3]).toBe('top');
    expect(stepPlacements?.[4]).toBe('left');
    expect(stepPlacements?.[9]).toBe('right');
    expect(stepPlacements?.[10]).toBe('right');
    expect(stepPlacements?.[12]).toBe('right');
    expect(stepPlacements?.[13]).toBe('left');
    expect(stepPlacements?.[18]).toBe('right');
    expect(screen.getByTestId('guide-tour')).toHaveAttribute(
      'data-horizontal-steps',
      '10|11|13|14|19'
    );
    expect(screen.getByTestId('guide-tour')).toHaveAttribute(
      'data-narrow-step-widths',
      '10:227|11:227|19:227'
    );
    expect(screen.getByTestId('guide-tour')).toHaveTextContent('custom-tooltip');
    expect(window.localStorage.getItem('hotzla-user-guide-seen-v1')).toBe('true');
  });

  it('remembers when the welcome guide is skipped', async () => {
    const user = userEvent.setup();

    const { unmount } = renderGuide();

    await user.click(await screen.findByRole('button', { name: 'דלג' }));

    expect(window.localStorage.getItem('hotzla-user-guide-seen-v1')).toBe('true');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

    unmount();
    renderGuide();

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('starts a current-page guide again from the sidebar action', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('hotzla-user-guide-seen-v1', 'true');

    renderGuide('/product/product-1');

    await user.click(screen.getByRole('button', { name: 'הפעל מדריך' }));

    expect(screen.getByTestId('guide-tour')).toHaveAttribute('data-running', 'true');
    expect(screen.getByTestId('guide-tour').getAttribute('data-targets')).toContain('פרטי הזמנה');

    await user.click(screen.getByRole('button', { name: 'סיים סיור מדומה' }));
    expect(screen.getByTestId('guide-tour')).toHaveAttribute('data-running', 'false');
    await waitFor(() =>
      expect((document.querySelector('[data-guide-app-content]') as HTMLDivElement).inert).toBe(
        false
      )
    );

    await user.click(screen.getByRole('button', { name: 'הפעל מדריך' }));
    expect(screen.getByTestId('guide-tour')).toHaveAttribute('data-running', 'true');
  });
});
