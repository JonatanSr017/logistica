// EmbarqueScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';

const EmbarqueScreen = ({ route }) => {
  const navigation = useNavigation();
  const { ordem } = route.params;
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todosConferidosEEmbarcados, setTodosConferidosEEmbarcados] = useState(false);

  useEffect(() => {
    buscarVolumes();
  }, []);

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
      verificarTodosVolumes(data);
    }
    setLoading(false);
  };

  const verificarTodosVolumes = (lista) => {
    const todosOk = lista.length > 0 && lista.every(v => v.confirma_embarque && v.embarcado);
    setTodosConferidosEEmbarcados(todosOk);
  };

  const handleConfirmar = async (volume) => {
    if (volume.confirma_embarque) {
      Alert.alert('Volume já foi conferido.');
      return;
    }

    const confirmar = await new Promise((resolve) => {
      Alert.alert(
        'Conferir Volume',
        `Deseja confirmar o volume ${volume.nVolume} da peça ${volume.codigo}?`,
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

    if (!error) buscarVolumes();
  };

  const handleEmbarcar = async (volume) => {
    if (!volume.confirma_embarque) {
      Alert.alert('Atenção', 'Você precisa confirmar o volume antes de embarcar.');
      return;
    }

    if (volume.embarcado) {
      Alert.alert('Volume já embarcado.');
      return;
    }

    const confirmar = await new Promise((resolve) => {
      Alert.alert(
        'Embarcar Volume',
        `Tem certeza que deseja marcar o volume ${volume.nVolume} da peça ${volume.codigo} como embarcado?`,
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Sim', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmar) return;

    const { error } = await supabase
      .from('itens_volume')
      .update({ embarcado: true })
      .eq('id', volume.id);

    if (!error) buscarVolumes();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Embarque e Conferência</Text>
      <Text style={styles.info}>Ordem: {ordem.contrato}</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#2980b9" />
      ) : (
        volumes.map((volume) => (
          <View key={volume.id} style={styles.card}>
            <Text style={styles.itemTitulo}>{volume.codigo} - {volume.descricao}</Text>
            <Text>Volume: {volume.nVolume}</Text>
            <Text>Quantidade: {volume.quantidade}</Text>

            <View style={styles.fotosContainer}>
              {[volume.foto1, volume.foto2, volume.foto3, volume.foto4].filter(Boolean).map((foto, idx) => (
                <Image key={idx} source={{ uri: foto }} style={styles.fotoMiniatura} />
              ))}
            </View>

            <View style={styles.botoesLinha}>
              <TouchableOpacity
                style={[styles.botao, volume.confirma_embarque ? styles.botaoConfirmado : styles.botaoConfirmar]}
                onPress={() => handleConfirmar(volume)}
              >
                <Text style={styles.textoBotao}>Conferir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botao, volume.embarcado ? styles.botaoEmbarcado : styles.botaoEmbarcar]}
                onPress={() => handleEmbarcar(volume)}
              >
                <Text style={styles.textoBotao}>Embarcar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {todosConferidosEEmbarcados && (
        <TouchableOpacity
          style={styles.botaoFinalizar}
          onPress={() => navigation.navigate('FinalizarEmbarque', { ordem })}
        >
          <Text style={styles.textoBotao}>Finalizar Embarque</Text>
        </TouchableOpacity>
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  info: {
    fontSize: 14,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#f2f2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemTitulo: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fotosContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
    flexWrap: 'wrap',
  },
  fotoMiniatura: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  botoesLinha: {
    flexDirection: 'row',
    gap: 10,
  },
  botao: {
    flex: 1,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  botaoConfirmar: {
    backgroundColor: '#f39c12',
  },
  botaoConfirmado: {
    backgroundColor: '#bdc3c7',
  },
  botaoEmbarcar: {
    backgroundColor: '#2980b9',
  },
  botaoEmbarcado: {
    backgroundColor: '#27ae60',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
  },
  botaoFinalizar: {
    backgroundColor: '#34495e',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default EmbarqueScreen;
