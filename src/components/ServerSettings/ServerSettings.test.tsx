import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import ServerSettings from './ServerSettings';

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) })) as jest.Mock;

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <ServerSettings
        serverId={1}
        serverName="Test"
        currentUsername="user"
        userId={1}
        onClose={jest.fn()}
        onServerDeleted={jest.fn()}
      />
    </Provider>
  );
});
