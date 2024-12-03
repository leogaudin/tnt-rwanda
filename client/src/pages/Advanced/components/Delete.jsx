import { useState } from 'react'
import BoxFiltering from '../../../components/BoxFiltering'
import { Button, Heading, Stack, useDisclosure } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { callAPI, deleteBoxes } from '../../../service';

export default function Delete() {
	const [filters, setFilters] = useState([]);
	const [count, setCount] = useState(0);
	const { t } = useTranslation();

	const handleDelete = () => {
		if (window.confirm(t('deletePrompt'))) {
			deleteBoxes(filters)
				.then((count) => {
					alert(`${count} boxes deleted`);
					window.location.reload();
				})
				.catch(console.error);
		}
	}


	return (
		<Stack
			align='stretch'
		>
			<Heading>{t('delete')}</Heading>
			<BoxFiltering
				filters={filters}
				setFilters={setFilters}
				count={count}
				setCount={setCount}
			/>
			{/* <BoxFiltering
				boxes={boxes}
				setFilteredBoxes={() => { }}
				setFiltersOutside={setFilters}
				includeProgress={false}
				includeSearch={false}
			/> */}
			<Button
				colorScheme='red'
				variant='solid'
				onClick={handleDelete}
			>
				{t('delete')}
			</Button>
		</Stack>
	)
}
