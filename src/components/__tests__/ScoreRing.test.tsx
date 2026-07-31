import React from 'react';
import { render } from '@testing-library/react-native';
import { ScoreRing } from '../ScoreRing';

describe('ScoreRing', () => {
  it('renders the score value formatted to one decimal place', () => {
    const { getByText } = render(<ScoreRing score={7.849} />);
    expect(getByText('7.8')).toBeTruthy();
  });

  it('renders the max scale label', () => {
    const { getByText } = render(<ScoreRing score={5} max={10} />);
    expect(getByText('/ 10')).toBeTruthy();
  });
});
