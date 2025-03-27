import { Flex, Heading, Icon, Text, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { icons } from '../../../service';
import DragDrop from '../../../components/DragDrop';
import { useState } from 'react';
import UploadModal from './UploadModal';
import { uploadDistributionList } from '../../../service/csv';
import { boxFields } from '../../../service/specific';

export default function UploadBoxes() {
	const { isOpen, onOpen } = useDisclosure();
	const { t } = useTranslation();
	const [file, setFile] = useState(null);

	const onFile = (file) => {
		setFile(file);
		onOpen();
	}

	return (
		<>
			{file && (
				<UploadModal
					isOpen={isOpen}
					file={file}
					handleFile={uploadDistributionList}
				/>
			)}
			<DragDrop
				height={400}
				onFile={onFile}
			>
				<Flex
					direction={{ base: 'column', md: 'row' }}
					align='center'
					justify='center'
					gap={2.5}
				>
					<Icon
						as={icons.plus}
						boxSize={5}
					/>
					<Heading>
						{t('addBoxes')}
					</Heading>
				</Flex>
				<Heading
					size='md'
					fontWeight='light'
					lineHeight={1.5}
				>
					{t('uploadPrompt')}
				</Heading>
				<Text
					opacity={0.5}
				>
					{t('columnOrder')}{': '}
					<code>{Object.keys(boxFields).map(field => t(field)).join(', ') + `, ${t('latitude')}, ${t('longitude')}`}, ...{t('content')}</code>
					<br /><br />
					{t('contentPrompt')}
				</Text>
			</DragDrop>
		</>
	)
}
