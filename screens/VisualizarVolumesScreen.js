// VisualizarVolumesScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const VisualizarVolumesScreen = ({ route }) => {
  const { ordem } = route.params;
  const [volumes, setVolumes] = useState([]);
  const [pesos, setPesos] = useState({});
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  const [usuario, setUsuario] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    buscarUsuario();
    buscarVolumes();
  }, []);

  const buscarUsuario = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      setUsuario(data.user);
    } else {
      console.log('Erro ao buscar usuário:', error.message);
    }
  };

  const buscarVolumes = async () => {
    const { data: volumesData, error: volumesError } = await supabase
      .from('itens_volume')
      .select('*')
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra);

    const { data: pesosData, error: pesosError } = await supabase
      .from('peso_itens')
      .select('codigo, peso_unitario');

    if (!volumesError && !pesosError) {
      const mapaPesos = {};

      pesosData.forEach((item) => {
        const valor = typeof item.peso_unitario === 'string'
          ? parseFloat(item.peso_unitario.replace(',', '.'))
          : parseFloat(item.peso_unitario);

        mapaPesos[item.codigo] = isNaN(valor) ? 0 : valor;
      });

      setVolumes(volumesData);
      setPesos(mapaPesos);
    } else {
      console.error('Erro ao buscar dados:', volumesError?.message, pesosError?.message);
    }
  };

  const abrirImagem = (url) => {
    setImagemAmpliada(url);
  };

  const fecharImagem = () => {
    setImagemAmpliada(null);
  };

  const calcularPesoVolume = (volume) => {
    const pesoUnitario = pesos[volume.codigo] || 0;
    return volume.quantidade * pesoUnitario;
  };

  const pesoTotalCarga = volumes.reduce(
    (total, vol) => total + calcularPesoVolume(vol),
    0
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Volumes Separados</Text>
        <Text style={styles.userInfo}>
          {usuario ? usuario.email : 'Carregando...'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {volumes.length === 0 ? (
          <Text style={styles.info}>Nenhum volume separado ainda.</Text>
        ) : (
          volumes.map((vol, index) => (
            <View key={index} style={styles.card}>
              <Text style={styles.label}>Volume Nº {vol.nVolume}</Text>
              <Text>Código: {vol.codigo}</Text>
              <Text>Descrição: {vol.descricao}</Text>
              <Text>Quantidade: {vol.quantidade}</Text>
              <Text>
                Peso do volume:{' '}
                {calcularPesoVolume(vol).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}{' '}
                kg
              </Text>

              <View style={styles.fotosContainer}>
                {[vol.foto1, vol.foto2, vol.foto3, vol.foto4].map((foto, i) =>
                  foto ? (
                    <TouchableOpacity key={i} onPress={() => abrirImagem(foto)}>
                      <Image source={{ uri: foto }} style={styles.fotoMiniatura} />
                    </TouchableOpacity>
                  ) : null
                )}
              </View>
            </View>
          ))
        )}

        {volumes.length > 0 && (
          <Text style={styles.pesoTotal}>
            Peso total da carga:{' '}
            {pesoTotalCarga.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}{' '}
            kg
          </Text>
        )}
      </ScrollView>

      {/* Modal de imagem ampliada */}
      <Modal visible={!!imagemAmpliada} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalFechar} onPress={fecharImagem}>
            <Text style={styles.modalFecharTexto}>Fechar</Text>
          </TouchableOpacity>
          {imagemAmpliada && (
            <Image source={{ uri: imagemAmpliada }} style={styles.imagemAmpliada} />
          )}
        </View>
      </Modal>
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
    fontSize: 20,
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
  card: {
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  label: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  fotosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  fotoMiniatura: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFechar: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  modalFecharTexto: {
    color: '#000',
    fontWeight: 'bold',
  },
  imagemAmpliada: {
    width: '90%',
    height: '70%',
    resizeMode: 'contain',
  },
  info: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    color: '#888',
  },
  pesoTotal: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
    color: '#000',
  },
});

export default VisualizarVolumesScreen;
