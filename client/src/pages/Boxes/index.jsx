import { useContext, useEffect, useState } from 'react';
import AppContext from '../../context';
import PagedGrid from '../../components/PagedGrid';
import BoxCard from '../../components/BoxCard';
// import BoxFiltering from '../../components/BoxFiltering';
import BoxFiltering from '../../components/BoxFiltering';
import { callAPI, user } from '../../service';

export default function Boxes() {
	const [filters, setFilters] = useState([]);
	const [query, setQuery] = useState('');
	const [count, setCount] = useState(0);

	useEffect(() => {
		const newQuery = filters.map(({ field, value }) => {
			if (value?.length)
				return `${field}=${value}`
		}).join('&');
		if (newQuery !== query){
			setQuery(newQuery);
			setCount(0);
		}
	}, [filters]);

	const fetchBoxes = async (skip, limit) => {
		console.log('fetchBoxes', skip, limit);
		const response = await callAPI(
			'GET',
			`boxes/${user?.id}?skip=${skip}&limit=${limit}&${query}`
		);
		const json = await response.json();
		console.log(json);
		return json.data.boxes;
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
				extraParams={query}
				renderElement={(box) => (
					<BoxCard box={box} key={box.id} />
				)}
			/>
		</>
	);
}
