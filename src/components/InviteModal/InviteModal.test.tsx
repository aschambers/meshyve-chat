import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import InviteModal from './InviteModal';

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <InviteModal serverId={1} onClose={jest.fn()} />
    </Provider>
  );
});
