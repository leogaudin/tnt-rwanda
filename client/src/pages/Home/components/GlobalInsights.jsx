import {
    Button,
    Card,
    Checkbox,
    CheckboxGroup,
    Flex,
    IconButton,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import ProjectInsights from './ProjectInsights';
import Loading from '../../../components/Loading';
import { useTranslation } from 'react-i18next';
import { callAPI, fetchInsights, icons } from '../../../service';

export default function GlobalInsights({ id }) {
    const [projects, setProjects] = useState(null);
    const [selected, setSelected] = useState(null);
    const [accumulated, setAccumulated] = useState(null);
    const [edit, setEdit] = useState(false);
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();

    /**
     * Fetches all possible project names
     */
    const getProjects = async () => {
        const response = await callAPI(
            'POST',
            'boxes/distinct/project',
        )
        const json = await response.json();
        return json.distinct;
    }

    /**
     * Fetches combined insights for selected projects
     * @param {Array} projects
     */
    const getGlobalInsights = async (projects) => {
        return await fetchInsights(
            {
                adminId: id,
                $or: projects.map((project) => ({ project }))
            },
            false
        );
    }

    /**
     * Initialization: fetches projects then corresponding insights
     */
    useEffect(() => {
        getProjects()
            .then((projects) => {
                setProjects(projects)
                setSelected(projects)

                getGlobalInsights(projects)
                    .then((insights) => setAccumulated(insights))
                    .then(() => setLoading(false))
            })
            .catch((e) => console.error(e));
    }, [])

    /**
     * Handles the "apply" action and fetches updated insights
     */
    const handleApply = () => {
        if (!selected || !selected.length)
            return;

        setEdit(false);
        setLoading(true);
        getGlobalInsights(selected)
            .then((insights) => setAccumulated(insights))
            .then(() => setLoading(false))
            .catch((e) => console.error(e));
    }

    /**
     * Edit mode
     */
    const Edit = () => {
        if (!projects)
            return <Loading />;

        return (
            <Card
                width='100%'
                direction='column'
                borderRadius={15}
                overflow='hidden'
                shadow='md'
                padding={5}
            >
                <CheckboxGroup
                    value={selected}
                    onChange={setSelected}
                >
                    <Flex
                        wrap='wrap'
                        justify='center'
                        gap={2}
                    >
                        {projects.map((project) => (
                            <Checkbox
                                colorScheme='gray'
                                key={project}
                                value={project}
                            >
                                {project}
                            </Checkbox>
                        ))}
                    </Flex>
                </CheckboxGroup>
                <Button
                    colorScheme='gray'
                    onClick={handleApply}
                    marginTop={5}
                >
                    {t('apply')}
                </Button>
            </Card>
        )
    }

    if (edit) {
        return <Edit />
    }

    if (!accumulated || loading) {
        return <Loading />;
    }

    return (
        <ProjectInsights
            menu={(
                <Flex>
                    <IconButton
                        variant='outline'
                        icon={edit ? <icons.close /> : <icons.edit />}
                        onClick={() => setEdit((prev) => !prev)}
                    />
                </Flex>
            )}
            insights={accumulated}
            project={t('globalInsights')}
        />
    )
}
