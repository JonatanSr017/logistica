// SepararVolumeScreen.js

import React, { useState } from 'react';
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

const SepararVolumeScreen = ({ route, navigation }) => {
  const { item, ordem } = route.params;
  const [nVolume, setNVolume] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [fotos, setFotos] = useState(['', '', '', '']);

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

  const uploadImage = async (uri) => {
    try {
      if (!uri) {
        Alert.alert('Erro', 'Nenhuma imagem foi selecionada.');
        return null;
      }

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const nomeArquivo = `${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('bucket1')
        .upload(`fotos/${nomeArquivo}`, new Uint8Array(arrayBuffer), {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        Alert.alert('Erro no upload', error.message);
        return null;
      }

      const { publicUrl } = supabase.storage
        .from('bucket1')
        .getPublicUrl(`fotos/${nomeArquivo}`).data;

      console.log('[URL DA IMAGEM]:', publicUrl);
      return publicUrl;
    } catch (err) {
      console.error('[UPLOAD ERROR]', err.message);
      Alert.alert('Erro de conexão', 'Ocorreu um erro ao enviar a imagem.');
      return null;
    }
  };

  const handleConcluir = async () => {
    if (!nVolume || !quantidade || parseInt(quantidade) <= 0) {
      Alert.alert('Preencha todos os campos com valores válidos.');
      return;
    }

    const fotosPreenchidas = fotos.filter(f => f !== '');
    if (fotosPreenchidas.length === 0) {
      Alert.alert('Erro', 'É necessário adicionar pelo menos uma foto.');
      return;
    }

    if (parseInt(quantidade) > item.saldo_separar) {
      Alert.alert('Erro', 'Quantidade maior do que o saldo a separar.');
      return;
    }

    const { data: existente } = await supabase
      .from('itens_volume')
      .select('*')
      .eq('id_itens', item.id)
      .eq('nVolume', nVolume)
      .maybeSingle();

    if (existente) {
      Alert.alert('Erro', 'Essa peça já foi adicionada neste volume. Escolha outro número de volume.');
      return;
    }

    const { error } = await supabase.from('itens_volume').insert({
      id_itens: item.id,
      quantidade: parseInt(quantidade),
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

    const novaSeparada = (item.qtde_separada || 0) + parseInt(quantidade);
    const novoSaldo = item.qtde_definida - novaSeparada;

    await supabase
      .from('itens_ordem')
      .update({ saldo_separar: novoSaldo, qtde_separada: novaSeparada })
      .eq('id', item.id);

    Alert.alert('Sucesso', 'Volume registrado com sucesso!');
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.titulo}>Separar Volume</Text>
        <Text style={styles.info}>Contrato: {ordem?.contrato}</Text>
        <Text style={styles.info}>Código: {item.codigo}</Text>
        <Text style={styles.info}>Descrição: {item.descricao}</Text>
        <Text style={styles.info}>Saldo a Separar: {item.saldo_separar}</Text>

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
            <TouchableOpacity
              key={index}
              style={styles.fotoBox}
              onPress={() => handleSelectImage(index)}
            >
              {foto ? (
                <Image source={{ uri: foto }} style={styles.foto} />
              ) : (
                <Text style={styles.fotoTexto}>+</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.botao} onPress={handleConcluir}>
          <Text style={styles.botaoTexto}>Concluir</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
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
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  fotoBox: {
    width: '23%',
    aspectRatio: 1,
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
