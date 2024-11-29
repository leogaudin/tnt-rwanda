import { Flex, Spinner, Text } from '@chakra-ui/react';

export default function Loading({
	message = '',
}) {
	return (
		<Flex
			width='100%'
			height='100%'
			justify='center'
			align='center'
			marginY='1rem'
		>
			<Spinner
				// color={palette.primary.dark}
			/>
			{message
				? <Text
					// color={palette.primary.dark}
					textTransform='uppercase'
					fontSize='small'
				>
					{message}
				</Text>
				: null
			}
		</Flex>
	)
}
