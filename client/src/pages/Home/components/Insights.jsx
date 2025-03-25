import Loading from '../../../components/Loading';
import ProjectInsights from './ProjectInsights';
import GlobalInsights from './GlobalInsights';
import { Divider } from '@chakra-ui/react';
import { computeInsights } from '../../../service/stats';

export default function Insights({ rawInsights, id }) {
	if (!rawInsights)
		return <Loading />;

	const grouped = computeInsights(rawInsights, { grouped: true });

	return (
		<>
			<GlobalInsights
				rawInsights={rawInsights}
				id={id}
			/>
			<Divider marginY={5} />
			{Object.keys(grouped).map((project, i) => {
				if (!grouped[project])
					return <Loading />;

				return (
					<ProjectInsights
						key={project + i}
						insights={grouped[project]}
						project={project}
					/>
				)
			})}
		</>
	)
}
