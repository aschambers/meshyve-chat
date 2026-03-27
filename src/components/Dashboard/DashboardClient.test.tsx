import '../../__mocks__/socketMock';
import { render } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import DashboardClient from './DashboardClient';

global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve([]) })) as jest.Mock;

const user = {
  id: 1,
  username: 'user',
  email: 'user@test.com',
  nameColor: null,
  imageUrl: null,
  description: null,
};

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <DashboardClient
        initialUser={user as never}
        initialServers={[]}
        initialActiveServer={null}
        initialPendingChatroomId={null}
      />
    </Provider>
  );
});
