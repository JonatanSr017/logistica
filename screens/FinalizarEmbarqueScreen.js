
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabaseClient';

const FinalizarEmbarqueScreen = ({ route, navigation }) => {
  const { ordem } = route.params;
  const [motorista, setMotorista] = useState('');
  const [placa, setPlaca] = useState('');
  const [fotos, setFotos] = useState([]);

  const handleSelectImage = async () => {
    if (fotos.length >= 10) {
      Alert.alert('Limite de fotos', 'Você pode enviar no máximo 10 fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const url = await uploadImage(uri);
      if (url) {
        setFotos([...fotos, url]);
      }
    }
  };

  const uploadImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const nomeArquivo = `${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
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
    } catch (err) {
      Alert.alert('Erro de conexão', 'Ocorreu um erro ao enviar a imagem.');
      return null;
    }
  };

  const removerFoto = (index) => {
    const novasFotos = [...fotos];
    novasFotos.splice(index, 1);
    setFotos(novasFotos);
  };

  const handleFinalizar = async () => {
    if (!motorista || !placa || fotos.length === 0) {
      Alert.alert('Preencha todos os campos e adicione ao menos uma foto.');
      return;
    }

    const { error } = await supabase.from('embarque_ordem').insert({
        chave_contrato_carga_obra: ordem.chave_contrato_carga_obra,
        nome_motorista: motorista,
        placa_caminhao: placa,
        foto1: fotos[0] || null,
        foto2: fotos[1] || null,
        foto3: fotos[2] || null,
        foto4: fotos[3] || null,
        foto5: fotos[4] || null,
        foto6: fotos[5] || null,
        foto7: fotos[6] || null,
        foto8: fotos[7] || null,
        foto9: fotos[8] || null,
        foto10: fotos[9] || null,
        data_hora: new Date().toISOString(),
      });

    if (error) {
      Alert.alert('Erro ao salvar embarque', error.message);
      return;
    }

    await supabase
      .from('ordens')
      .update({ finalizado: true })
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra);

    Alert.alert('Embarque Finalizado!', 'Informações salvas com sucesso.');
    navigation.navigate('Home');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Finalizar Embarque</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome do Motorista"
        value={motorista}
        onChangeText={setMotorista}
      />
      <TextInput
        style={styles.input}
        placeholder="Placa do Caminhão"
        value={placa}
        onChangeText={setPlaca}
      />

      <TouchableOpacity style={styles.botaoFoto} onPress={handleSelectImage}>
        <Text style={styles.botaoTexto}>Tirar/Selecionar Foto</Text>
      </TouchableOpacity>

      <View style={styles.fotoContainer}>
        {fotos.map((foto, index) => (
          <View key={index} style={styles.fotoWrapper}>
            <Image source={{ uri: foto }} style={styles.foto} />
            <TouchableOpacity
              style={styles.removerBotao}
              onPress={() => removerFoto(index)}
            >
              <Text style={styles.removerTexto}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.botaoFinalizar} onPress={handleFinalizar}>
        <Text style={styles.botaoTexto}>Finalizar Embarque</Text>
      </TouchableOpacity>
    </ScrollView>
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  botaoFoto: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  botaoFinalizar: {
    backgroundColor: '#2ecc71',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  fotoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fotoWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    marginRight: 8,
    marginBottom: 8,
  },
  foto: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  removerBotao: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'red',
    borderRadius: 10,
    paddingHorizontal: 4,
  },
  removerTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});

export default FinalizarEmbarqueScreen;
