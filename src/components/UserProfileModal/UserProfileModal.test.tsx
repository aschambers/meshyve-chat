import { render } from '@testing-library/react';
import UserProfileModal from './UserProfileModal';

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) })) as jest.Mock;

it('renders without crashing', () => {
  render(<UserProfileModal userId={1} username="user" isSelf onClose={jest.fn()} />);
});
