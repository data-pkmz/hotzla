import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import DemoDataPanel from '../DemoDataPanel';

describe('DemoDataPanel', () => {
  it('clearly labels sample information as fictional and non-interactive', () => {
    render(<DemoDataPanel areaLabel="הקטלוג" />);

    expect(screen.getByText(/המידע המוצג ב\s*הקטלוג\s*פיקטיבי לדוגמה\./)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
