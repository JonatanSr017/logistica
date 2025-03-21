// HomeScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OrdemCard from '../components/OrdemCard';
import { supabase } from '../lib/supabaseClient';

const HomeScreen = ({ navigation }) => {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);

  const buscarOrdens = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ordens')
      .select('*')
      .eq('finalizado', false)
      .order('data_hora_entrega', { ascending: false });

    if (error) {
      Alert.alert('Erro ao buscar ordens', error.message);
    } else {
      setOrdens(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarOrdens();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={ordens}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <OrdemCard
            ordem={item}
            onPress={() =>
              navigation.navigate('DetalheOrdem', {
                ordem: item,
              })
            }
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default HomeScreen;
