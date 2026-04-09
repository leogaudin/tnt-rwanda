import { Divider } from '@chakra-ui/react'
import About from './components/About'
import Delete from './components/Delete'
import ProjectEmails from './components/ProjectEmails'
import { enableProjectEmails } from '../../service/specific'

export default function Advanced() {

	return (
		<>
			<Delete />
			{enableProjectEmails && (
				<>
					<Divider marginY={5} />
					<ProjectEmails />
				</>
			)}
			<Divider marginY={5} />
			<About />
		</>
	)
}
