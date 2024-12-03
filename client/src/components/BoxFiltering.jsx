import {
	HStack,
	Select,
	IconButton,
	Stack,
	Text,
	Flex,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { palette } from '../theme';
import { boxFields } from '../service/specific';
import { useTranslation } from 'react-i18next';
import { callAPI, icons, progresses } from '../service';

export default function BoxFiltering({
	filters = [],
	setFilters,
	count,
	setCount,
}) {
	const [loading, setLoading] = useState(false);
	const [possibleValues, setPossibleValues] = useState({});

	const { t } = useTranslation();

	const updatePossibleValues = async () => {
		setLoading(true);
		const results = await Promise.all(
			filters
				.map(async ({ field: boxField }) => {
					if (boxField === 'progress')
						return {
							progress: progresses
										.map((progress) => progress.key)
										.filter((progress) => progress !== 'total')
						};

					if (!boxFields[boxField])
						return;

					const response = await callAPI(
						'POST',
						`boxes/distinct/${boxField}`,
						{
							filters: filters.reduce((acc, { field, value }) => {
										if (value?.length && field !== boxField)
											return ({ ...acc, [field]: value });
										return acc;
									}, {})
						}
					);

					if (!response.ok)
						return;

					const json = await response.json();

					return {
						[boxField]: json.distinct,
					}
				})
		);


		const flattened = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
		const progress = progresses.map((progress) => progress.key);
		setPossibleValues({ ...flattened, progress });

		setLoading(false);
	}

	const updateCount = async () => {
		const response = await callAPI(
			'POST',
			`boxes/count`,
			{ filters: filters.reduce((acc, { field, value }) => ({ ...acc, [field]: value }), {}) }
		);

		if (!response.ok)
			return;

		const json = await response.json();
		setCount(json.count);
	}

	useEffect(() => {
		updateCount();
		if (filters[filters.length - 1]?.field.length) {
			updatePossibleValues();
		}
	}, [filters]);

	const FilterSelect = ({ filter, index }) => {
		return (
			<HStack
				bg={palette.gray.light}
				borderRadius={15}
				padding={2.5}
			>
				<Select
					value={filter.field}
					placeholder={t(filter.field) || t('select', { option: t('field') })}
					onChange={(event) => handleFieldChange(index, event)}
					focusBorderColor={palette.primary.dark}
				>
					{Object.keys(boxFields).map((field) => {
						if (filters.some((filter) => filter.field === field)) return null;
						return (
							<option key={field} value={field}>
								{t(field)}
							</option>
						)
					})}
					<option value='progress'>{t('progress')}</option>
				</Select>
				<Select
					value={filter.value}
					placeholder={filter.value || t('select', { option: t('value') })}
					onChange={(event) => handleValueChange(index, event)}
					focusBorderColor={palette.primary.dark}
				>
					{possibleValues[filter.field]?.map((option) => (
						<option key={option} value={option}>
							{t(option)}
						</option>
					))}
				</Select>
				<IconButton
					variant='outline'
					icon={<icons.delete />}
					onClick={() => removeFilter(index)}
					color={palette.error.main}
					borderColor={palette.error.main}
					bg='transparent'
				/>
			</HStack>
		)
	}

	const addFilter = () => {
		setFilters((prev) => [...prev, { field: '', value: '' }]);
	}

	const removeFilter = (index) => {
		setFilters((prev) => prev.filter((_, i) => i !== index));
	}

	const handleFieldChange = (index, event) => {
		const newFilters = [...filters];
		newFilters[index].field = event.target.value;
		newFilters[index].value = '';
		setFilters(newFilters);
	}

	const handleValueChange = (index, event) => {
		const newFilters = [...filters];
		newFilters[index].value = event.target.value;
		setFilters(newFilters);
	}

	return (
		<Stack
			justify='center'
			align='center'
			textAlign='center'
			padding={5}
			gap={2.5}
			bg={palette.gray.lightest}
			borderRadius={15}
			pointerEvents={loading ? 'none' : 'auto'}
			opacity={loading ? 0.5 : 1}
			transition='opacity 0.2s'
		>
			<Text fontWeight='bold'>{t('filters')}</Text>
			<Flex
				justify='center'
				align='center'
				gap={2.5}
				wrap='wrap'
			>
				{filters.map((filter, index) => (
					<FilterSelect
						key={index}
						filter={filter}
						index={index}
					/>
				))}
				<IconButton
					variant='outline'
					icon={<icons.plus />}
					onClick={addFilter}
				/>
			</Flex>
			<Text
				fontSize='small'
				fontWeight='bold'
				textTransform='uppercase'
				marginY={5}
			>
				{t('itemsSelected', { count: count })}
			</Text>
		</Stack>
	);
}
