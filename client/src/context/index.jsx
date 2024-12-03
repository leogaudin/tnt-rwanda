import React, { createContext, useEffect, useState } from 'react';
import { callAPI, fetchInsights, user } from '../service';

const AppContext = createContext({
	insights: [],
	language: 'en',
	setLanguage: () => { },
	loading: true,
});

export const AppProvider = ({ children }) => {
	const [language, setLanguage] = useState('en');
	const [loading, setLoading] = useState(true);
	const [insights, setInsights] = useState(null);

	const initTnT = async (setters) => {
		const { setInsights } = setters;
		const res = await callAPI('GET', 'auth/me')
							.then(res => res.json())
		const me = res.user;
		localStorage.setItem('user', JSON.stringify(me));
		Object.assign(user, me);

		const insights = await fetchInsights(user.id);

		setInsights(insights);
	}

	useEffect(() => {
		if (!user?.id) return;

		initTnT({ setInsights })
			.then(() => setLoading(false))
			.catch((e) => {
				console.error(e);
			});
	}, []);

	return (
		<AppContext.Provider
			value={{
				insights,
				language,
				setLanguage,
				loading,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};

export default AppContext;
