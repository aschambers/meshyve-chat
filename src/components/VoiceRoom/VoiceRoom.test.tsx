import '../../__mocks__/socketMock';
import { render } from '@testing-library/react';
import VoiceRoom from './VoiceRoom';

it('renders without crashing', () => {
  render(
    <VoiceRoom
      username="user"
      activeChatroom="voice"
      activeChatroomId={1}
      serverId={1}
    />
  );
});
