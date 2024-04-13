import React, { useState, useContext, useMemo } from 'react';
import BoxSummary from './BoxSummary';
import { SeverityPill } from './customisation/SeverityPill';
import TableCard from './reusable/TableCard';
import { getProgress } from '../service/statistics';
import { colorsMap, getTextsMap } from '../constants';
import AppContext from '../context/AppContext';
import { useTranslation } from 'react-i18next';
import BoxFiltering from './controls/BoxFiltering';

function BoxesOverview({ pageSize = 10 }) {
	const [boxDialogOpen, setBoxDialogOpen] = useState(false);
	const [boxID, setBoxID] = useState('');
	const {boxes, isMobile} = useContext(AppContext);
	const textsMap = getTextsMap();
	const [filteredBoxes, setFilteredBoxes] = useState([]);
	const { t } = useTranslation();

	const rows = useMemo(() => {
		return filteredBoxes
		  ? filteredBoxes.map((box) => {
			  const progress = getProgress(box);
			  return isMobile
				? [
					box.id,
					box.school,
					<SeverityPill color={colorsMap[progress]}>{textsMap[progress]}</SeverityPill>
				]
				: [
					box.id,
					box.project,
					box.school,
					<SeverityPill color={colorsMap[progress]}>{textsMap[progress]}</SeverityPill>,
				  ];
			})
		  : null;
	  }, [filteredBoxes, isMobile, textsMap]);

	return (
		<TableCard
			contentName={t('boxes').toLowerCase()}
			columns={
				isMobile
				? [
					t('id'),
					t('recipient'),
					t('status')
				]
				: [
					t('id'),
					t('project'),
					t('recipient'),
					t('status')
				]
			}
			rows={rows}
			pageSize={pageSize}
			setDialogOpen={setBoxDialogOpen}
			setSelectedItem={setBoxID}
			translateTimeIndex={-1}
		>
			<BoxFiltering boxes={boxes} setFilteredBoxes={setFilteredBoxes} />
			<BoxSummary
				id={boxID}
				open={boxDialogOpen}
				setOpen={setBoxDialogOpen}
			/>
		</TableCard>
	);
}

export default React.memo(BoxesOverview);
