import React from 'react';
import { render } from '@testing-library/react-native';
const CreateAccountScreen = require('../src/screens/auth/CreateAccountScreen').default;

it('debug render', async () => {
  const { debug } = await render(<CreateAccountScreen />);
  debug();
});