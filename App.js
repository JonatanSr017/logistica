import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './screens/HomeScreen';
import DetalheOrdemScreen from './screens/DetalheOrdemScreen';
import SepararVolumeScreen from './screens/SepararVolumeScreen';
import ChecklistSeparacaoScreen from './screens/ChecklistSeparacaoScreen'; // 👈 esse aqui

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Ordens de Carga' }} />
        <Stack.Screen name="DetalheOrdem" component={DetalheOrdemScreen} options={{ title: 'Detalhes da Ordem' }} />
        <Stack.Screen name="SepararVolume" component={SepararVolumeScreen} options={{ title: 'Separar Volume' }} />
        <Stack.Screen name="ChecklistSeparacao" component={ChecklistSeparacaoScreen} options={{ title: 'Checklist de Separação' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
