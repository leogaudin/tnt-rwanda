import { Stack } from '@chakra-ui/react';
import InsightsController from './components/InsightsController';
import Insights from './components/Insights';
import { useContext } from 'react';
import AppContext from '../../context';
import Loading from '../../components/Loading';

export default function Home() {
	const { insights } = useContext(AppContext);

	if (!insights)
		return <Loading message={t('insightsLoading')} />;
	return (
		<Stack
			width='100%'
		>
			<InsightsController />
			<Insights insights={insights} />
		</Stack>
	);
}
