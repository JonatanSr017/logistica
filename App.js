// App.js

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import DetalheOrdemScreen from './screens/DetalheOrdemScreen';
import SepararVolumeScreen from './screens/SepararVolumeScreen';
import EmbarqueScreen from './screens/EmbarqueScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Ordens de Carga' }} />
        <Stack.Screen name="DetalheOrdem" component={DetalheOrdemScreen} options={{ title: 'Itens da Ordem' }} />
        <Stack.Screen name="SepararVolume" component={SepararVolumeScreen} options={{ title: 'Separar Volume' }} />
        <Stack.Screen name="EmbarqueScreen" component={EmbarqueScreen} options={{ title: 'Embarque e Conferência' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

