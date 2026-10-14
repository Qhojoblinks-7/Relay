import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native/Libraries/Components/Touchable/TouchableOpacity', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children, onPress, ...props }) => {
      console.log('[TouchableOpacity mock] onPress:', typeof onPress);
      return React.createElement(View, { ...props, onPress }, children);
    },
  };
});

const mockFn = jest.fn();

function TestScreen() {
  return (
    <View>
      <TouchableOpacity onPress={() => mockFn('pressed')}>
        <Text>Press Me</Text>
      </TouchableOpacity>
    </View>
  );
}

it('fires press and calls handler', async () => {
  const { getByText } = await render(<TestScreen />);
  const textEl = getByText('Press Me');
  
  await fireEvent.press(textEl);
  
  console.log('[test] mockFn calls:', mockFn.mock.calls);
  expect(mockFn).toHaveBeenCalledWith('pressed');
});