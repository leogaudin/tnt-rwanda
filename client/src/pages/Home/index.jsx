import { Stack } from '@chakra-ui/react';
import InsightsController from './components/InsightsController';
import Insights from './components/Insights';
import { useContext } from 'react';
import AppContext from '../../context';
import { useTranslation } from 'react-i18next';
import BigLoading from '../../components/BoxesLoading';

export default function Home() {
	const { insights } = useContext(AppContext);
	const { t } = useTranslation();

	if (!insights)
		return <BigLoading message={t('insightsLoading')} />
	return (
		<Stack
			width='100%'
		>
			<InsightsController />
			<Insights insights={insights} />
		</Stack>
	);
}
