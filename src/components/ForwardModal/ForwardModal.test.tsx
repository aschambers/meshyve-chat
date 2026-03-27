import '../../__mocks__/socketMock';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { mockStore } from '../../__mocks__/reduxMock';
import ForwardModal from './ForwardModal';

it('renders without crashing', () => {
  render(
    <Provider store={mockStore}>
      <ForwardModal messageText="Hello" userId={1} username="user" onClose={jest.fn()} />
    </Provider>
  );
});
