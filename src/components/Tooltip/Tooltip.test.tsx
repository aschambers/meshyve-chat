import { render } from '@testing-library/react';
import Tooltip from './Tooltip';

it('renders without crashing', () => {
  render(
    <Tooltip text="Hello">
      <button>Child</button>
    </Tooltip>
  );
});
