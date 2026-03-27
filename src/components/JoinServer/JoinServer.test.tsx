import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import JoinServer from './JoinServer';

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <JoinServer userId={1} email="test@test.com" onClose={jest.fn()} onSuccess={jest.fn()} />
    </Provider>
  );
});
