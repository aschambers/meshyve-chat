import { render } from '@testing-library/react';
import FriendsModal from './FriendsModal';

it('renders without crashing', () => {
  render(
    <FriendsModal
      friends={[]}
      currentUserId={1}
      onlineUsers={new Map()}
      pendingRequests={[]}
      onClose={jest.fn()}
      onMessage={jest.fn()}
      onUnfriend={jest.fn()}
      onAcceptRequest={jest.fn()}
      onDeclineRequest={jest.fn()}
    />
  );
});
