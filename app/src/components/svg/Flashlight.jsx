import React from 'react';
import Svg, { Path } from 'react-native-svg';

export default function Flashlight() {
	return (
		<Svg
			fill='#fff'
			width='20px'
			height='20px'
			viewBox='0 0 20 20'
		>
			<Path d='M13 7v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7L5 5V3h10v2l-2 2zM9 8v1a1 1 0 1 0 2 0V8a1 1 0 0 0-2 0zM5 0h10v2H5V0z' />
		</Svg>
	);
}
