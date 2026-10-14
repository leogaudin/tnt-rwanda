import { useContext, useState } from 'react';
import { Linking, View } from 'react-native';
import { Text } from 'react-native-paper';
import styles from '../theme/styles';
import Toast from 'react-native-toast-message';
import AppContext from '../context';
import SendScanModal from '../components/SendScanModal';
import OfflineScansModal from '../components/OfflineScansModal';
import IconButton from '../components/IconButton';
import Flashlight from '../components/svg/Flashlight';
import Offline from '../components/svg/Offline';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';

// Attribution notice required by the additional terms in LICENSE
// (AGPL-3.0 section 7(b)). Do not remove or hide.
function PoweredBy() {
	return (
		<Text
			onPress={() => Linking.openURL('https://github.com/leogaudin/tnt')}
			style={{
				position: 'absolute',
				bottom: 20,
				alignSelf: 'center',
				color: 'white',
				fontSize: 12,
				textShadowColor: 'black',
				textShadowRadius: 4,
			}}
		>
			Powered by TnT (Track-and-Trace)
		</Text>
	);
}

function NoCameraDeviceError() {
	return (
		<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
			<Text style={{ textAlign: 'center' }}>
				No camera was found on this device, so boxes cannot be scanned.
			</Text>
			<PoweredBy />
		</View>
	);
}

export default function Scanner() {
	const device = useCameraDevice('back');

	const { hasCameraPermissions, hasLocationPermissions, loading } = useContext(AppContext);

	const [flash, setFlash] = useState(false);
	const [sendScanVisible, setSendScanVisible] = useState(false);
	const [offlineScansVisible, setOfflineScansVisible] = useState(false);
	const [data, setData] = useState('');
	const [active, setActive] = useState(true);

	const codeScanner = useCodeScanner({
		codeTypes: ['qr'],
		onCodeScanned: (codes, frame) => {
			const code = codes[0];
			handleRead(code.value);
		}
	});

	const handleRead = (content) => {
		if (sendScanVisible || !active) return;
		setActive(false);
		if (content.startsWith('tnt://')) {
			content = content.replace('tnt://', '');
			setData(content);
			setSendScanVisible(true);
		}
		setTimeout(() => {
			setActive(true);
		}, 3000);
	};


	if (device == null)
		return <NoCameraDeviceError />;
	if (!(hasCameraPermissions && hasLocationPermissions) || loading)
		return null;

	return (
		<View>
			<Camera
				codeScanner={codeScanner}
				style={styles.camera}
				device={device}
				isActive={true}
				torch={flash ? 'on' : 'off'}
				photoQualityBalance='speed'
			/>
			<SendScanModal
				modalVisible={sendScanVisible}
				setModalVisible={setSendScanVisible}
				data={data}
			/>
			<OfflineScansModal
				visible={offlineScansVisible}
				onClose={() => setOfflineScansVisible(false)}
			/>
			<View style={{
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginTop: 50,
			}}>
				<IconButton onPress={() => setOfflineScansVisible(true)} icon={<Offline />} />
				<IconButton onPress={() => setFlash(!flash)} icon={<Flashlight />} />
			</View>
			<PoweredBy />
			<Toast />
		</View>
	);
}
