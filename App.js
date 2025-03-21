// App.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen'; // IMPORTANTE
import HomeScreen from './screens/HomeScreen';
import DetalheOrdemScreen from './screens/DetalheOrdemScreen';
import SepararVolumeScreen from './screens/SepararVolumeScreen';
import EmbarqueScreen from './screens/EmbarqueScreen';
import FinalizarEmbarqueScreen from './screens/FinalizarEmbarqueScreen';
import VisualizarVolumesScreen from './screens/VisualizarVolumesScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="DetalheOrdem" component={DetalheOrdemScreen} options={{ title: 'Itens da Ordem' }} />
        <Stack.Screen name="SepararVolume" component={SepararVolumeScreen} options={{ title: 'Separar Volume' }} />
        <Stack.Screen name="EmbarqueScreen" component={EmbarqueScreen} options={{ title: 'Embarque e Conferência' }} />
        <Stack.Screen name="FinalizarEmbarque" component={FinalizarEmbarqueScreen} options={{ title: 'Finalizar Embarque' }} />
        <Stack.Screen name="VisualizarVolumesScreen" component={VisualizarVolumesScreen} options={{ title: 'Volumes Separados' }}
/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
