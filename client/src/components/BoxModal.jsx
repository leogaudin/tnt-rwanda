import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalCloseButton,
	Text,
	Stack,
	Flex,
	Divider,
	Button,
	useDisclosure,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import ScansMap from '../pages/Boxes/components/ScansMap';
import PagedTable from './PagedTable';
import { timeAgo } from '../service/utils';
import { excludedKeys } from '../service/specific';
import ContentCard from './ContentCard';
import SchoolModal from './SchoolModal';
import { callAPI, icons, user } from "../service";
import Loading from "./Loading";
import { useEffect, useState } from "react";

export default function BoxModal({
	isOpen,
	onClose,
	box,
}) {
	const { t } = useTranslation();

	const [school, setSchool] = useState(null);
	const { isOpen: isSchoolOpen, onOpen: onSchoolOpen, onClose: onSchoolClose } = useDisclosure();

	const fetchSchool = async () => {
		const response = await callAPI('GET', `boxes/${user.id}?school=${box.school}`);
		const json = await response.json();

		const school = {
			name: box.school,
			boxes: json.data.boxes,
		};

		setSchool(school);
	}

	useEffect(() => {
		if (isOpen)
			fetchSchool();
	}, [isOpen]);

	const handleDelete = async () => {
		if (window.confirm(t('deletePrompt'))) {
			await callAPI(
				'DELETE',
				'boxes',
				{ deleteConditions: { id: box.id } }
			);

			onClose();
			window.location.reload();
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='5xl'>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader
					fontWeight='bold'
				>
					<code>{box.id}</code>
				</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Stack>
						<Stack
							padding={5}
							borderRadius={10}
							shadow='md'
						>
							<Stack
								direction={{ base: 'column', md: 'row' }}
								justify={{ base: 'center', md: 'space-between' }}
								align={{ base: 'center', md: 'start' }}
								width='100%'
							>
								<Stack
									gap={2}
								>
									{Object.entries(box).map(([key, value]) => {
										if (excludedKeys.includes(key) || !value)
											return null;
										return (
											<Text key={key}>
												<code>{t(key)}</code>: <strong>{value}</strong>
											</Text>
										);
									})}
								</Stack>
								<QRCodeSVG
									value={'tnt://' + box.id}
									size={256}
									level='H'
								/>
							</Stack>
							{box.content && (
								<>
									<Divider marginY='1rem' />
									<ContentCard box={box} />
								</>
							)}
							{school
								? (
									<>
										<SchoolModal
											isOpen={isSchoolOpen}
											onClose={onSchoolClose}
											school={school}
										/>
										<Button
											variant='outline'
											colorScheme='gray'
											rightIcon={<icons.right />}
											onClick={onSchoolOpen}
										>
											{t('openRecipient')}
										</Button>
									</>
								)
								: <Loading />
							}
						</Stack>
						{box.scans?.length &&
							<>
								<Divider marginY='1rem' />
								<Flex
									direction='column'
									justify={{ base: 'center', md: 'space-between' }}
									gap={5}
									padding={5}
									borderRadius={10}
									shadow='md'
								>
									<ScansMap box={box} />
									<PagedTable
										elements={box.scans}
										headers={[
											t('time'),
											t('comment'),
											t('received'),
											t('reachedGps')
										]}
										fields={[
											'time',
											'comment',
											'markedAsReceived',
											'finalDestination',
										]}
										transforms={{
											time: (time) => timeAgo(time),
										}}
										allowToChoosePageSize={false}
									/>
								</Flex>
							</>
						}
						<Button
							colorScheme='red'
							onClick={handleDelete}
							variant='ghost'
						>
							{t('delete')}
						</Button>
					</Stack>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}
