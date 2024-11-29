import {
	HStack,
	useToken,
} from '@chakra-ui/react';

export default function Pill({
	color,
	text,
	icon,
	variant,
	...props
}) {
	const [red, orange, green] = useToken('colors', ['red.500', 'orange.500', 'green.500']);

	if (color === 'error') color = red;
	if (color === 'warning') color = orange;
	if (color === 'success') color = green;

	const additionalStyles = {
		backgroundColor: variant === 'solid' ? color + '25' : 'transparent',
		border: variant === 'outline' ? `1.5px solid ${color}` : 'none',
		justifyContent: icon ? 'left' : 'center',
		padding: text ? '0.25rem 0.75rem' : '0.5rem',
	};

	return (
		<HStack
			style={{
				color: color,
				borderRadius: 20,
				padding: '0.25rem 0.75rem',
				fontWeight: 600,
				margin: '0.25rem',
				cursor: 'inherit',
				...additionalStyles,
				...props.style,
			}}
			_hover={{
				opacity: props.onClick ? 0.7 : 1,
				cursor: props.onClick ? 'pointer' : 'default',
			}}
			onClick={props.onClick}
			{...props}
		>
			{icon &&
				icon
			}
			{text?.length &&
				<span>{text}</span>
			}
		</HStack>
	);
}
