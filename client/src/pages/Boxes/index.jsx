import { useEffect, useState } from 'react';
import PagedGrid from '../../components/PagedGrid';
import BoxCard from '../../components/BoxCard';
import BoxFiltering from '../../components/BoxFiltering';
import { callAPI } from '../../service';

export default function Boxes() {
	const [filters, setFilters] = useState([]);
	const [query, setQuery] = useState('');
	const [count, setCount] = useState(0);

	useEffect(() => {
		const newQuery = filters
							.map(({ field, value }) => {
								if (value?.length)
									return `${field}=${value}`;
							})
							.filter((x) => x)
							.join('&');

		if (newQuery !== query){
			setQuery(newQuery);
			setCount(0);
		}
	}, [filters]);

	const fetchBoxes = async (skip, limit) => {
		const response = await callAPI(
			'POST',
			`boxes/query?skip=${skip}&limit=${limit}`,
			{ filters: filters.reduce((acc, { field, value }) => ({ ...acc, [field]: value }), {}) }
		);
		const json = await response.json();
		return json.boxes || [];
	};

	return (
		<>
			<BoxFiltering
				filters={filters}
				setFilters={setFilters}
				count={count}
				setCount={setCount}
			/>
			<PagedGrid
				// elements={filtered}
				count={count}
				fetchElements={fetchBoxes}
				extraParams={filters}
				renderElement={(box) => (
					<BoxCard box={box} key={box.id} />
				)}
			/>
		</>
	);
}
