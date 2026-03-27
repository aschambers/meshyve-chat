import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import ServerChannelList from './ServerChannelList';

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <ServerChannelList
        serverId={1}
        serverName="Test"
        isAdmin={false}
        userId={1}
        serverUserList={[]}
        activeChatroomId={null}
        voiceParticipants={{}}
        currentUsername="user"
        voiceMuted={false}
        voiceDeafened={false}
        voiceDeafenedUsers={{}}
        onVoiceMuteToggle={jest.fn()}
        onVoiceDeafenToggle={jest.fn()}
        onSelectChatroom={jest.fn()}
        onJoinVoice={jest.fn()}
        onOpenVoiceChat={jest.fn()}
        onOpenSettings={jest.fn()}
        onLeaveServer={jest.fn()}
      />
    </Provider>
  );
});
