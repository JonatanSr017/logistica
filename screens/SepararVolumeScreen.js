import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const SepararVolumeScreen = ({ route }) => {
  const { item: itemOriginal, ordem } = route.params;

  const [item, setItem] = useState(itemOriginal);
  const [nVolume, setNVolume] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [fotos, setFotos] = useState(['', '', '', '']);
  const [saldoAtual, setSaldoAtual] = useState(itemOriginal.saldo_separar);
  const [concluirHabilitado, setConcluirHabilitado] = useState(false);
  const [usuario, setUsuario] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    const buscarUsuario = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error) setUsuario(data.user);
    };

    buscarUsuario();
  }, []);

  useEffect(() => {
    const fetchItemAtualizado = async () => {
      const { data, error } = await supabase
        .from('itens_ordem')
        .select('*')
        .eq('id', itemOriginal.id)
        .maybeSingle();

      if (!error && data) {
        setItem(data);
        setSaldoAtual(data.saldo_separar);
      }
    };

    fetchItemAtualizado();
  }, []);

  useEffect(() => {
    const qtd = parseInt(quantidade);
    if (!isNaN(qtd)) {
      const novoSaldo = item.saldo_separar - qtd;
      setSaldoAtual(novoSaldo >= 0 ? novoSaldo : 0);
    } else {
      setSaldoAtual(item.saldo_separar);
    }

    setConcluirHabilitado(
      nVolume !== '' &&
      !isNaN(qtd) &&
      qtd > 0 &&
      qtd <= item.saldo_separar &&
      fotos.some(f => f !== '')
    );
  }, [quantidade, nVolume, fotos]);

  const handleSelectImage = async (index) => {
    Alert.alert(
      'Adicionar Foto',
      'Como deseja adicionar a imagem?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Galeria',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
            });
            if (!result.canceled) {
              const uri = result.assets[0].uri;
              const url = await uploadImage(uri);
              if (url) {
                const novasFotos = [...fotos];
                novasFotos[index] = url;
                setFotos(novasFotos);
              }
            }
          },
        },
        {
          text: 'Câmera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              quality: 0.7,
            });
            if (!result.canceled) {
              const uri = result.assets[0].uri;
              const url = await uploadImage(uri);
              if (url) {
                const novasFotos = [...fotos];
                novasFotos[index] = url;
                setFotos(novasFotos);
              }
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleRemoverFoto = (index) => {
    const novasFotos = [...fotos];
    novasFotos[index] = '';
    setFotos(novasFotos);
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const nomeArquivo = `${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('bucket1')
        .upload(`fotos/${nomeArquivo}`, new Uint8Array(arrayBuffer), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (error) {
        Alert.alert('Erro no upload', error.message);
        return null;
      }

      const { publicUrl } = supabase.storage
        .from('bucket1')
        .getPublicUrl(`fotos/${nomeArquivo}`).data;

      return publicUrl;
    } catch {
      Alert.alert('Erro de conexão', 'Ocorreu um erro ao enviar a imagem.');
      return null;
    }
  };

  const handleConcluir = async () => {
    const qtdInt = parseInt(quantidade);
    if (!nVolume || !quantidade || qtdInt <= 0) {
      Alert.alert('Preencha todos os campos com valores válidos.');
      return;
    }

    if (qtdInt > item.qtde_definida || qtdInt > item.saldo_separar) {
      Alert.alert('Erro', 'Quantidade maior que o permitido.');
      return;
    }

    const fotosPreenchidas = fotos.filter(f => f !== '');
    if (fotosPreenchidas.length === 0) {
      Alert.alert('Erro', 'É necessário adicionar pelo menos uma foto.');
      return;
    }

    const { data: existente } = await supabase
      .from('itens_volume')
      .select('*')
      .eq('id_itens', item.id)
      .eq('nVolume', nVolume)
      .maybeSingle();

    if (existente) {
      Alert.alert('Erro', 'Esse número de volume já existe para esse item.');
      return;
    }

    const { error } = await supabase.from('itens_volume').insert({
      id_itens: item.id,
      quantidade: qtdInt,
      nVolume,
      foto1: fotos[0],
      foto2: fotos[1],
      foto3: fotos[2],
      foto4: fotos[3],
      codigo: item.codigo,
      descricao: item.descricao,
      chave_contrato_carga_obra: item.chave_contrato_carga_obra,
      embarcado: false,
      confirma_embarque: false,
    });

    if (error) {
      Alert.alert('Erro ao salvar volume', error.message);
      return;
    }

    const novaSeparada = (item.qtde_separada || 0) + qtdInt;
    const novoSaldo = item.qtde_definida - novaSeparada;

    await supabase
      .from('itens_ordem')
      .update({ saldo_separar: novoSaldo, qtde_separada: novaSeparada })
      .eq('id', item.id);

    Alert.alert('Sucesso', 'Volume registrado com sucesso!');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Separar Volume</Text>
        <Text style={styles.userInfo}>
          {usuario ? usuario.email : 'Carregando...'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.info}>Contrato: {ordem?.contrato}</Text>
          <Text style={styles.info}>Código: {item.codigo}</Text>
          <Text style={styles.info}>Descrição: {item.descricao}</Text>
          <Text style={styles.info}>Saldo a Separar: {saldoAtual}</Text>

          <TextInput
            style={styles.input}
            placeholder="Número do Volume"
            keyboardType="numeric"
            value={nVolume}
            onChangeText={setNVolume}
          />

          <TextInput
            style={styles.input}
            placeholder="Quantidade no Volume"
            keyboardType="numeric"
            value={quantidade}
            onChangeText={setQuantidade}
          />

          <Text style={styles.subtitulo}>Fotos do Volume (mínimo 1)</Text>
          <View style={styles.fotoContainer}>
            {fotos.map((foto, index) => (
              <View key={index} style={styles.fotoWrapper}>
                <TouchableOpacity
                  style={styles.fotoBox}
                  onPress={() => handleSelectImage(index)}
                >
                  {foto ? (
                    <Image source={{ uri: foto }} style={styles.foto} />
                  ) : (
                    <Text style={styles.fotoTexto}>+</Text>
                  )}
                </TouchableOpacity>
                {foto !== '' && (
                  <TouchableOpacity
                    onPress={() => handleRemoverFoto(index)}
                    style={styles.removerBtn}
                  >
                    <Text style={{ color: 'white' }}>X</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.botao,
              !concluirHabilitado && { backgroundColor: '#ccc' },
            ]}
            onPress={handleConcluir}
            disabled={!concluirHabilitado}
          >
            <Text style={styles.botaoTexto}>Concluir</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    padding: 20,
    backgroundColor: '#fff',
  },
  info: {
    fontSize: 16,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  fotoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fotoWrapper: {
    position: 'relative',
    width: '23%',
    aspectRatio: 1,
  },
  fotoBox: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    overflow: 'hidden',
  },
  foto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  fotoTexto: {
    fontSize: 24,
    color: '#888',
  },
  removerBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 10,
    padding: 4,
    zIndex: 1,
  },
  botao: {
    backgroundColor: '#27ae60',
    marginTop: 20,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SepararVolumeScreen;
