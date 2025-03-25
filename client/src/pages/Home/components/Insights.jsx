import Loading from '../../../components/Loading';
import ProjectInsights from './ProjectInsights';
import GlobalInsights from './GlobalInsights';
import { Divider } from '@chakra-ui/react';

export default function Insights({ insights, id }) {
	if (!insights)
		return <Loading />;

	return (
		<>
			<GlobalInsights
				id={id}
			/>
			<Divider marginY={5} />
			{Object.keys(insights).map((project, i) => {
				if (!insights[project])
					return <Loading />;

				return (
					<ProjectInsights
						key={project + i}
						insights={insights[project]}
						project={project}
					/>
				)
			})}
		</>
	)
}
