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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';

const EmbarqueScreen = ({ route }) => {
  const navigation = useNavigation();
  const { ordem } = route.params;

  const [usuario, setUsuario] = useState(null);
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todosConferidosEEmbarcados, setTodosConferidosEEmbarcados] = useState(false);
  const [itensOrdem, setItensOrdem] = useState([]);

  useEffect(() => {
    buscarUsuario();
    buscarDados();
  }, []);

  const buscarUsuario = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setUsuario(data.user);
  };

  const buscarDados = async () => {
    setLoading(true);

    const { data: volumesData, error: volumesError } = await supabase
      .from('itens_volume')
      .select('*')
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra);

    const { data: itensData, error: itensError } = await supabase
      .from('itens_ordem')
      .select('*')
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra);

    if (volumesError || itensError) {
      Alert.alert('Erro ao buscar dados', volumesError?.message || itensError?.message);
    } else {
      setVolumes(volumesData);
      setItensOrdem(itensData);
      verificarTodosVolumes(volumesData, itensData);
    }
    setLoading(false);
  };

  const verificarTodosVolumes = (volumes, itens) => {
    if (volumes.length === 0 || itens.length === 0) {
      setTodosConferidosEEmbarcados(false);
      return;
    }

    const todosItensSeparados = itens.every((item) => {
      const volumesDoItem = volumes.filter((v) => v.id_itens === item.id);
      const totalSeparado = volumesDoItem.reduce((sum, v) => sum + v.quantidade, 0);
      return item.qtde_definida > 0 && totalSeparado === item.qtde_definida;
    });

    const todosVolumesOk = volumes.every((v) => v.confirma_embarque && v.embarcado);

    setTodosConferidosEEmbarcados(todosItensSeparados && todosVolumesOk);
  };

  const handleConfirmar = async (volume) => {
    const itemRelacionado = itensOrdem.find((i) => i.id === volume.id_itens);
    const volumesDoItem = volumes.filter((v) => v.id_itens === volume.id_itens);
    const totalSeparado = volumesDoItem.reduce((sum, v) => sum + v.quantidade, 0);

    if (itemRelacionado?.qtde_definida > 0 && totalSeparado < itemRelacionado.qtde_definida) {
      Alert.alert('Erro', `Item ${itemRelacionado.codigo} ainda não está totalmente separado.`);
      return;
    }

    const confirmar = await new Promise((resolve) => {
      Alert.alert(
        'Confirmar Volume',
        `Deseja realmente confirmar o volume ${volume.nVolume} do item ${volume.codigo}?`,
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

    if (!error) buscarDados();
  };

  const handleEmbarcar = async (volume) => {
    if (!volume.confirma_embarque) {
      Alert.alert('Atenção', 'Você precisa confirmar o volume antes de embarcar.');
      return;
    }

    const confirmar = await new Promise((resolve) => {
      Alert.alert(
        'Embarcar Volume',
        `Tem certeza que deseja marcar o volume ${volume.nVolume} do item ${volume.codigo} como embarcado?`,
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

    if (!error) buscarDados();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Cabeçalho padrão */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Embarque e Conferência</Text>
        <Text style={styles.userInfo}>
          {usuario ? usuario.email : 'Carregando...'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
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
                {[volume.foto1, volume.foto2, volume.foto3, volume.foto4]
                  .filter(Boolean)
                  .map((foto, idx) => (
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    fontSize: 12,
    color: '#555',
  },
  container: {
    padding: 16,
    backgroundColor: '#fff',
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
