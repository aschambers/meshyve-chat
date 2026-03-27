import { render } from '@testing-library/react';
import MessageContextMenu from './MessageContextMenu';

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) })) as jest.Mock;

const base = {
  isSelf: false,
  onReact: jest.fn(),
  onMoreReact: jest.fn(),
  onCopy: jest.fn(),
  onForward: jest.fn(),
  onClose: jest.fn(),
};

it('renders without crashing', () => {
  render(<MessageContextMenu {...base} />);
});
