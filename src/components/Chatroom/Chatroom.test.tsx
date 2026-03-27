import '../../__mocks__/socketMock';
import { render } from '@testing-library/react';
import Chatroom from './Chatroom';

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })) as jest.Mock;

it('renders without crashing', () => {
  render(
    <Chatroom
      userId={1}
      username="user"
      activeChatroom="general"
      activeChatroomId={1}
      activeChatroomType="text"
      serverId={1}
      isAdmin={false}
      serverUserList={[]}
      onlineUsers={new Map()}
      onStartDM={jest.fn()}
    />
  );
});
