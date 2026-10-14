import React, { createContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dedupeOfflineData, getString, removeValue, storeOfflineData } from '../service/storage';
import { requestAllPermissions } from '../service/permissions';
import { loginKey, offlineKey } from '../constants';

const AppContext = createContext({
	login: null,
	setLogin: () => { },
	hasInternetConnection: false,
	setInternetConnection: () => { },
	hasCameraPermissions: true,
	setCameraPermissions: () => { },
	hasLocationPermissions: true,
	setLocationPermissions: () => { },
	offlineData: [],
	setOfflineData: () => { },
	loading: true,
	setLoading: () => { },

});

export const AppProvider = ({ children }) => {
	const [login, setLogin] = useState(null);
	const [hasInternetConnection, setInternetConnection] = useState(false);
	const [hasCameraPermissions, setCameraPermissions] = useState(true);
	const [hasLocationPermissions, setLocationPermissions] = useState(true);
	const [offlineData, setOfflineData] = useState([]);
	const [loading, setLoading] = useState(true);

	const hydrated = useRef(false);

	useEffect(() => {
		if (!hydrated.current)
			return;
		storeOfflineData(offlineData);
	}, [offlineData]);

	useEffect(() => {
		const hasConnection = NetInfo.addEventListener((state) => {
			setInternetConnection(state.isConnected);
		});

		const checkLogin = async () => {
			const userNumber = await getString(loginKey);
			setLogin(userNumber);
		};

		const checkAllPermissions = async () => {
			const allPermissions = await requestAllPermissions();
			setLocationPermissions(allPermissions.location);
			setCameraPermissions(allPermissions.camera);
		}

		const retrieveOfflineData = async () => {
			try {
				const storedData = await AsyncStorage.getItem(offlineKey);
				if (storedData)
					setOfflineData(dedupeOfflineData(JSON.parse(storedData)));
			} catch (error) {
				console.error('Error retrieving offline data:', error);
			} finally {
				hydrated.current = true;
			}
		};

		Promise.all([
			hasConnection,
			checkLogin(),
			checkAllPermissions(),
			retrieveOfflineData(),
		])
			.then(() => setLoading(false));
	}, []);

	return (
		<AppContext.Provider
			value={{
				login,
				hasInternetConnection,
				setLogin,
				setInternetConnection,
				hasCameraPermissions,
				setCameraPermissions,
				hasLocationPermissions,
				setLocationPermissions,
				offlineData,
				setOfflineData,
				loading,
				setLoading,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};

export default AppContext;
