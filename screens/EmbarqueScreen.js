// EmbarqueScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';

const EmbarqueScreen = ({ route }) => {
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
      Alert.alert('Erro ao carregar volumes', error.message);
    } else {
      setVolumes(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarVolumes();
  }, []);

  const handleConferir = async (volume) => {
    const confirmar = await new Promise((resolve) => {
      Alert.alert(
        'Confirmar Conferência',
        `Deseja confirmar que o volume ${volume.nVolume} com ${volume.quantidade} unidades da peça ${volume.codigo} está correto?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirmar', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmar) return;

    const { error } = await supabase
      .from('itens_volume')
      .update({ confirma_embarque: true })
      .eq('id', volume.id);

    if (error) {
      Alert.alert('Erro ao confirmar', error.message);
    } else {
      buscarVolumes();
    }
  };

  const handleEmbarcar = async (volume) => {
    if (!volume.confirma_embarque) {
      Alert.alert('Atenção', 'Você precisa conferir o volume antes de embarcar.');
      return;
    }

    const confirmar = await new Promise((resolve) => {
      Alert.alert(
        'Confirmar Embarque',
        `Deseja confirmar o embarque do volume ${volume.nVolume} da peça ${volume.codigo}?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirmar', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmar) return;

    const { error } = await supabase
      .from('itens_volume')
      .update({ embarcado: true })
      .eq('id', volume.id);

    if (error) {
      Alert.alert('Erro ao embarcar', error.message);
    } else {
      buscarVolumes();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Volumes da Ordem {ordem.contrato}</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        volumes.map((volume) => (
          <View key={volume.id} style={styles.card}>
            <Text style={styles.codigo}>Código: {volume.codigo}</Text>
            <Text>Volume: {volume.nVolume}</Text>
            <Text>Quantidade: {volume.quantidade}</Text>

            <View style={styles.botoesLinha}>
              <TouchableOpacity
                style={[styles.botao, { backgroundColor: volume.confirma_embarque ? '#ccc' : '#f39c12' }]}
                onPress={() => !volume.confirma_embarque && handleConferir(volume)}
              >
                <Text style={styles.textoBotao}>
                  {volume.confirma_embarque ? 'Conferido ✅' : 'Conferir'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botao, { backgroundColor: volume.embarcado ? '#ccc' : '#2980b9' }]}
                onPress={() => !volume.embarcado && handleEmbarcar(volume)}
              >
                <Text style={styles.textoBotao}>
                  {volume.embarcado ? 'Embarcado ✅' : 'Embarcar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  codigo: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  botoesLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  botao: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default EmbarqueScreen;
