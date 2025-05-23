import React, { useState } from 'react';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import {
	Document,
	Page,
	Text as PDFText,
	View,
	StyleSheet,
	Font,
	Image,
	pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { fetchBoxes, icons } from '../../../service';
import { boxFields } from '../../../service/specific';
import { Button, Text, Stack, HStack, Icon } from '@chakra-ui/react';

const PDFExport = ({ filters, folderName = 'Documents' }) => {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [pagesComplete, setPagesComplete] = useState(0);
	const [loadingText, setLoadingText] = useState('');

	Font.register({
		family: 'Inter',
		fonts: [
			{ src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjQ.ttf' },
			{ src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZ9hjQ.ttf', fontWeight: 900 },
		],
	});

	const styles = StyleSheet.create({
		page: {
			fontFamily: 'Inter',
			flexDirection: 'row',
			height: '150mm',
			width: '100mm',
			padding: '5mm'
		},
		documentContainer: {
			flexDirection: 'column',
			height: '145mm',
			width: '95mm',
		},
		infoHeading: {
			fontSize: '5mm',
			textTransform: 'uppercase',
			textAlign: 'center',
			marginBottom: '3mm',
			fontWeight: 900,
		},
		infoRow: {
			fontSize: '3mm',
			flexDirection: 'row',
			width: '100%',
			textAlign: 'center',
			alignItems: 'center',
			justifyContent: 'center',
			marginBottom: '2mm',
		},
		infoLabel: {
			fontWeight: 900,
		},
		qrCodeContainer: {
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
		},
		qrCodeValue: {
			fontSize: '3mm',
			textAlign: 'center',
			marginTop: '2mm',
		},
		qrCode: {
			margin: '2mm',
			width: '70mm',
			height: '70mm',
		},
		serial: {
			position: 'absolute',
			bottom: '3mm',
			right: '3mm',
			fontSize: '2mm',
		}
	});

	const QRCodePNG = async ({ id }) => {
		const qrCodeDataURL = await QRCode.toDataURL(
			'tnt://' + id,
			{
				errorCorrectionLevel: 'H',
				width: 100,
				margin: 0
			}
		)

		return (
			<View style={styles.qrCodeContainer}>
				<Image style={styles.qrCode} src={qrCodeDataURL} />
				<PDFText style={styles.qrCodeValue}>{id}</PDFText>
			</View>
		);
	};

	const InfoRows = ({ object }) => {
		return Object.keys(boxFields).map((field) => {
			if (object[field]) {
				return (
					<View style={styles.infoRow} key={field}>
						<PDFText style={styles.infoLabel}>{t(field)}: </PDFText>
						<PDFText>{object[field]}</PDFText>
					</View>
				);
			}
			return null;
		});
	};

	const ContentText = ({ content }) => {
		if (!Object.keys(content).length) return null;
		return (
			<View style={styles.infoRow}>
				<PDFText>
					{t('content')}:{' '}
					{Object.entries(content).map(([element, quantity], i) => {
						if (quantity)
							return `${i > 0 ? ', ' : ''}${quantity} ${t(element)}`
					})}
				</PDFText>
			</View>
		)
	};


	const renderPages = async (chunk, i, totalLength) => {
		return await Promise.all(chunk.map(async (object, index) => {
			const { id } = object;

			const qrComponent = await QRCodePNG({ id });

			return (
				<Page orientation='portrait' key={id} size={['100mm', '150mm']} style={styles.page}>
					<View style={styles.documentContainer}>
						<InfoRows object={object} />
						<ContentText content={object.content || {}} />
						{qrComponent}
						<PDFText style={styles.serial}>{i + index + 1}/{totalLength}</PDFText>
					</View>
				</Page>
			);
		}));
	};

	const downloadDocuments = async () => {
		try {
			setLoading(true);
			setLoadingText(t('boxesLoading'));
			const boxes = await fetchBoxes(filters, { packingListId: 1 });
			if (!boxes || !boxes.length) {
				throw new Error('No boxes available');
			}
			setLoadingText(t('generatingPdf'));
			const zip = new JSZip();
			let chunkIndex = 0;
			const CHUNK_SIZE = 1000;
			const totalLength = boxes.length;

			for (let i = 0; i < totalLength; i += CHUNK_SIZE) {
				const chunk = boxes.slice(i, i + CHUNK_SIZE);
				const pages = await renderPages(chunk, i, totalLength);
				const blob = await pdf(<Document>{pages}</Document>).toBlob();
				zip.file(`${folderName}_${chunkIndex}.pdf`, blob, { binary: true });
				setPagesComplete(a => {
					const newLength = a + chunk.length;
					setLoadingText(`${newLength}/${totalLength} ${t('generated')}`);
					return newLength;
				});
				chunkIndex++;
			}

			zip.generateAsync({ type: 'blob' }).then((content) => {
				saveAs(content, `${folderName}.zip`);
				setLoading(false);
				setPagesComplete(0);
				setLoadingText('');
			});
		} catch (err) {
			console.error(err);
			setLoading(false);
			setPagesComplete(0);
			setLoadingText('');
		}
	};

	return (
		<Button
			variant='outline'
			size='lg'
			onClick={downloadDocuments}
			isLoading={loading}
			loadingText={loadingText}
			paddingY='1rem'
			height='fit-content'
		>
			<HStack
				width='100%'
				gap={5}
			>
				<Icon
					as={icons.print}
					boxSize={5}
				/>
				<Stack
					flexDirection='column'
					alignItems='start'
					textAlign='start'
				>
					<Text>{t('printableLabels')}</Text>
					<Text fontWeight='light' whiteSpace='normal'>{t('printableLabelsDetail')}</Text>
				</Stack>
			</HStack>
		</Button>
	);
};

export default PDFExport;
