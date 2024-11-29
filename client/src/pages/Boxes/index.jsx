import { useContext, useState } from 'react';
import AppContext from '../../context';
import PagedGrid from '../../components/PagedGrid';
import BoxCard from '../../components/BoxCard';
import BoxFiltering from '../../components/BoxFiltering';

export default function Boxes() {
	const { boxes } = useContext(AppContext);
	const [filtered, setFiltered] = useState(boxes);

	return (
		<>
			<BoxFiltering
				boxes={boxes}
				setFilteredBoxes={setFiltered}
			/>
			<PagedGrid
				elements={filtered}
				renderElement={(box) => (
					<BoxCard box={box} key={box.id} />
				)}
			/>
		</>
	);
}
