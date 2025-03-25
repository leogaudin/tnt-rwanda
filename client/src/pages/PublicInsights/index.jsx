import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchInsights } from '../../service';
import Insights from '../Home/components/Insights';
import BigLoading from '../../components/BoxesLoading';

export default function PublicInsights() {
	const { id } = useParams();
	const [rawInsights, setRawInsights] = useState(null);

	useEffect(() => {
		fetchInsights({ adminId: id })
			.then((raw) => {
				setRawInsights(raw);
			})
			.catch((e) => console.error(e))
	}, [id])

	return (
		<>
			{rawInsights
				? <Insights
					rawInsights={rawInsights}
					id={id}
				/>
				: <BigLoading />
			}
		</>
	);
}
