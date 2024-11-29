import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalCloseButton,
	Stack,
	CircularProgress,
	Heading,
	SimpleGrid,
	Flex,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next';
import { palette } from '../theme';
import BoxCard from './BoxCard';

export default function SchoolModal({
	isOpen,
	onClose,
	school,
}) {
	if (!school || !school.boxes || !Array.isArray(school.boxes)) {
		return null;
	}
	const { t } = useTranslation();

	const calculateContent = (boxes, key) => {
		return boxes.reduce((acc, box) => {
			const contents = Object.keys(box.content || {});

			for (const item of contents) {
				if (!acc[item]) {
					acc[item] = 0;
				}
				if (key === 'validated' && box.statusChanges?.validated) {
					acc[item] += box.content[item];
				} else if (key === 'total') {
					acc[item] += box.content[item];
				}
			}

			return acc;
		}, {});
	};

	const validated = calculateContent(school.boxes, 'validated');
	const totals = calculateContent(school.boxes, 'total');

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='5xl'>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader
					fontWeight='bold'
				>
					{school.name}
				</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Stack
						align='center'
					>
						{Object.keys(totals || {}).length > 0 &&
							<>
								<Heading
									color={palette.gray.main}
									fontWeight='light'
									size='lg'
								>
									{t('validated')}
								</Heading>
								<Stack
									justify='center'
									direction={{ base: 'column', md: 'row' }}
									gap={5}
								>
									{Object.keys(totals).map((item) => {
										return (
											<Stack
												align='center'
												key={item}
											>
												<Heading
													size='md'
												>
													{t(item)}
												</Heading>
												<CircularProgress
													value={100 * validated[item] / totals[item]}
													color={palette.text}
													size='42px'
												/>
												<Heading
													size='sm'
													fontWeight='light'
												>
													<code>{validated[item]}/{totals[item]}</code>
												</Heading>
											</Stack>
										);
									})}
								</Stack>
							</>
						}
						<Heading
							color={palette.gray.main}
							fontWeight='light'
							size='lg'
						>
							{t('boxes')}
						</Heading>
						<Stack
							width='100%'
						>
							{school.boxes.map((box) => {
								return (<BoxCard key={box.id} box={box} />);
							})}
						</Stack>
					</Stack>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}
