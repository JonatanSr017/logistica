// VolumesSeparados.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';

const VolumesSeparados = ({ route }) => {
  const { ordem } = route.params;
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);

  const buscarVolumes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('itens_volume')
      .select('*')
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra);

    if (error) {
      Alert.alert('Erro ao buscar volumes', error.message);
    } else {
      setVolumes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarVolumes();
  }, []);

  const renderVolume = (volume, index) => (
    <View key={index} style={styles.card}>
      <Text style={styles.titulo}>Volume {volume.nVolume}</Text>
      <Text style={styles.info}>Peça: {volume.codigo}</Text>
      <Text style={styles.info}>Descrição: {volume.descricao}</Text>
      <Text style={styles.info}>Quantidade: {volume.quantidade}</Text>
      <View style={styles.fotosContainer}>
        {[volume.foto1, volume.foto2, volume.foto3, volume.foto4].map(
          (foto, idx) =>
            foto ? (
              <Image
                key={idx}
                source={{ uri: foto }}
                style={styles.foto}
              />
            ) : null
        )}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Volumes Separados - Ordem {ordem.contrato}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : volumes.length === 0 ? (
        <Text style={styles.nenhum}>Nenhum volume registrado ainda.</Text>
      ) : (
        volumes.map((vol, idx) => renderVolume(vol, idx))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  info: {
    fontSize: 14,
    marginBottom: 4,
  },
  fotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  foto: {
    width: 80,
    height: 80,
    borderRadius: 6,
    marginRight: 8,
  },
  nenhum: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default VolumesSeparados;
