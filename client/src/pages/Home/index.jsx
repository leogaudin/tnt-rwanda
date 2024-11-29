import { Stack } from '@chakra-ui/react';
import InsightsController from './components/InsightsController';
import Insights from './components/Insights';
import { useContext } from 'react';
import AppContext from '../../context';
import BoxesLoading from '../../components/BoxesLoading';

export default function Home() {
	const { insights } = useContext(AppContext);

	if (!insights)
		return <BoxesLoading />;
	return (
		<Stack
			width='100%'
		>
			<InsightsController />
			<Insights insights={insights} />
		</Stack>
	);
}
