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

	const projects = [...new Set(school.boxes.map((box) => box.project))];

	const getContent = () => {
		const content = {};

		for (const project of projects) {
			content[project] = school.boxes.reduce((acc, box) => {
				if (box.project === project) {
					const contents = Object.keys(box.content || {});

					for (const item of contents) {
						if (!acc[item]) {
							acc[item] = { validated: 0, total: 0 };
						}
						if (box.statusChanges?.validated) {
							acc[item]['validated'] += box.content[item];
						}
						acc[item]['total'] += box.content[item];
					}
				}

				return acc;
			}, {});
		}

		return content;
	}

	const content = getContent();

	const ContentCard = ({ title, content }) => {
		return (
			<Stack
				align='center'
				width='100%'
				padding='1.5rem'
				shadow='md'
				borderRadius={15}
			>
				<Flex
					wrap='wrap'
					width='100%'
					gap='1rem'
				>
					{Object.keys(content).map((item) => {
						const validated = content[item].validated;
						const total = content[item].total;

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
									value={100 * validated / total}
									color={palette.text}
									size='42px'
								/>
								<Heading
									size='sm'
									fontWeight='light'
								>
									<code>{validated}/{total}</code>
								</Heading>
							</Stack>
						);
					})}
				</Flex>
			</Stack >
		);
	}

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
						{Object.keys(content).length > 0 &&
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
									direction='column'
									gap={5}
								>
									{projects.map((project) => {
										if (!Object.keys(content[project]).length) {
											return null;
										}
										return (
											<Stack
												align='center'
												key={project}
											>
												<Heading
													size='md'
													width='100%'
													textAlign='center'
													fontWeight='normal'
												>
													{project}
												</Heading>
												<ContentCard
													title={project}
													content={content[project]}
												/>
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
							marginTop='1rem'
						>
							{t('boxes')}
						</Heading>
						<Stack
							width='100%'
						>
							{projects.map((project) => {
								return (
									<Stack
										key={project}
									>
										<Heading
											size='md'
											marginTop='.5rem'
											textAlign='center'
											fontWeight='normal'
										>
											{project}
										</Heading>
										{school.boxes.map((box) => {
											if (box.project === project) {
												return (<BoxCard key={box.id} box={box} />);
											}
										})}
									</Stack>
								);
							})}
						</Stack>
					</Stack>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}
