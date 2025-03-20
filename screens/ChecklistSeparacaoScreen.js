import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';

const ChecklistSeparacaoScreen = ({ route, navigation }) => {
  const { ordem } = route.params;
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);

  const buscarItensSeparados = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('itens_ordem')
      .select('id, codigo, descricao, qtde_definida, qtde_separada')
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra);

    if (error) {
      Alert.alert('Erro ao buscar itens', error.message);
    } else {
      setItens(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarItensSeparados();
  }, []);

  const tudoSeparado = itens.every(item => item.qtde_separada === item.qtde_definida);

  const handleAvancar = () => {
    if (!tudoSeparado) {
      Alert.alert('Atenção', 'Ainda há itens com separação pendente.');
      return;
    }

    Alert.alert('✅', 'Aqui você pode avançar para o próximo checklist ou para a tela de carregamento no caminhão.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Checklist de Separação</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <ScrollView style={styles.lista}>
          {itens.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.codigo}>Código: {item.codigo}</Text>
              <Text>Descrição: {item.descricao}</Text>
              <Text>Definido: {item.qtde_definida}</Text>
              <Text>Separado: {item.qtde_separada || 0}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.botao} onPress={handleAvancar}>
        <Text style={styles.textoBotao}>Avançar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  lista: {
    flex: 1,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  codigo: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  botao: {
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ChecklistSeparacaoScreen;
