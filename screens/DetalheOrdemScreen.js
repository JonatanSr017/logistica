// DetalheOrdemScreen.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

const DetalheOrdemScreen = ({ route }) => {
  const navigation = useNavigation();
  const { ordem } = route.params;

  const [usuario, setUsuario] = useState(null);
  const [itens, setItens] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [modoEdicao, setModoEdicao] = useState({});
  const [loading, setLoading] = useState(true);
  const [podeEmbarcar, setPodeEmbarcar] = useState(false);
  const [porcentagemSeparacao, setPorcentagemSeparacao] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const buscarUsuario = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setUsuario(data.user);
  };

  const buscarItens = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('itens_ordem')
      .select('*')
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra);

    if (error) {
      Alert.alert('Erro ao buscar itens', error.message);
    } else {
      setItens(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarUsuario();
    buscarItens();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      buscarItens();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const verificarProgresso = () => {
      const itensComQtde = itens.filter((item) => item.qtde_definida > 0);
      const total = itensComQtde.length;
      const concluidos = itensComQtde.filter(
        (item) => item.qtde_separada === item.qtde_definida
      ).length;

      const todosSeparados = total > 0 && concluidos === total;
      setPodeEmbarcar(todosSeparados);

      const porcentagem = total > 0 ? Math.round((concluidos / total) * 100) : 0;
      setPorcentagemSeparacao(porcentagem);
    };

    verificarProgresso();
  }, [itens]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const atualizarQuantidadeItem = async (itemId, novaQtde) => {
    const { error } = await supabase
      .from('itens_ordem')
      .update({
        qtde_definida: novaQtde,
        saldo_separar: novaQtde,
        selecionado: novaQtde > 0,
      })
      .eq('id', itemId);
    return error;
  };

  const confirmarQuantidade = async (item) => {
    let entrada = quantidades[item.id];
    if (entrada === '' || entrada === null || entrada === undefined) {
      entrada = '0';
    }

    const novaQtde = parseInt(entrada);
    const antigaQtde = item.qtde_definida || 0;

    if (isNaN(novaQtde) || novaQtde < 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida (0 ou mais).');
      return;
    }

    const saldoDisponivel = item.carga + antigaQtde;
    if (novaQtde > saldoDisponivel) {
      Alert.alert('Erro', 'Quantidade não pode ser maior que o saldo disponível.');
      return;
    }

    if (antigaQtde > 0 && novaQtde !== antigaQtde) {
      const continuar = await new Promise((resolve) => {
        Alert.alert(
          'Confirmar Alteração',
          `Deseja alterar a quantidade de ${antigaQtde} para ${novaQtde}?`,
          [
            { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
            { text: 'Confirmar', onPress: () => resolve(true) },
          ]
        );
      });

      if (!continuar) return;
    }

    const error = await atualizarQuantidadeItem(item.id, novaQtde);

    if (error) {
      Alert.alert('Erro ao salvar', error.message);
    } else {
      setItens((prevItens) =>
        prevItens.map((i) =>
          i.id === item.id
            ? {
                ...i,
                qtde_definida: novaQtde,
                saldo_separar: novaQtde,
                selecionado: novaQtde > 0,
              }
            : i
        )
      );
      setModoEdicao({ ...modoEdicao, [item.id]: false });
      Alert.alert('Sucesso', `Quantidade de ${item.codigo} atualizada para ${novaQtde}.`);
    }
  };

  const renderItem = ({ item }) => {
    const emEdicao = modoEdicao[item.id];
    const entradaAtual = quantidades[item.id] !== undefined
      ? parseInt(quantidades[item.id]) || 0
      : item.qtde_definida || 0;

    const saldoACarregar = item.carga - entradaAtual;

    let statusCor = '#ccc';
    let statusTexto = '🔴 Não definido';

    if (item.qtde_definida > 0 && item.qtde_separada === item.qtde_definida) {
      statusCor = '#2ecc71';
      statusTexto = '🟢 Separado';
    } else if (item.qtde_separada > 0 && item.qtde_separada < item.qtde_definida) {
      statusCor = '#f1c40f';
      statusTexto = '🟡 Parcial';
    }

    return (
      <View key={item.id} style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Text style={styles.codigo}>Código: {item.codigo}</Text>
          <Text style={[styles.statusTag, { backgroundColor: statusCor }]}>{statusTexto}</Text>
        </View>

        <Text>Descrição: {item.descricao}</Text>
        <Text>Saldo a Carregar: {saldoACarregar}</Text>
        <Text>Quantidade Definida: {item.qtde_definida || 0}</Text>

        {emEdicao ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Nova quantidade"
              value={quantidades[item.id] || ''}
              onChangeText={(text) =>
                setQuantidades({ ...quantidades, [item.id]: text })
              }
            />
            <TouchableOpacity style={styles.botao} onPress={() => confirmarQuantidade(item)}>
              <Text style={styles.textoBotao}>Salvar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity
              style={styles.botaoEditar}
              onPress={() => {
                setModoEdicao({ ...modoEdicao, [item.id]: true });
                setQuantidades({
                  ...quantidades,
                  [item.id]: String(item.qtde_definida || ''),
                });
              }}
            >
              <Text style={styles.textoEditar}>
                {item.qtde_definida > 0 ? 'Editar qtde' : 'Definir qtde'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botaoEditar,
                {
                  backgroundColor:
                    item.qtde_definida > 0 && item.saldo_separar > 0 ? '#2980b9' : '#ccc',
                },
              ]}
              onPress={() => {
                if (item.qtde_definida === 0) {
                  Alert.alert('Atenção', 'Defina uma quantidade antes de separar o volume.');
                } else if (item.saldo_separar <= 0) {
                  Alert.alert('Atenção', 'Todos os volumes deste item já foram separados.');
                } else {
                  navigation.navigate('SepararVolume', { item, ordem });
                }
              }}
              disabled={item.qtde_definida === 0 || item.saldo_separar <= 0}
            >
              <Text style={styles.textoEditar}>Separar Volume</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <SafeAreaView style={styles.container}>
        {/* Cabeçalho padrão */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Itens da Ordem {ordem.contrato}</Text>
          <Text style={styles.userInfo}>
            {usuario ? usuario.email : 'Carregando...'}
          </Text>
        </View>

        <View style={styles.progressoContainer}>
          <View style={[styles.barraProgresso, { width: `${porcentagemSeparacao}%` }]} />
        </View>
        <Text style={styles.textoProgresso}>
          Progresso de separação: {porcentagemSeparacao}%
        </Text>

        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flex: 1 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : (
              itens.map((item) => renderItem({ item }))
            )}
          </View>
        </ScrollView>

        {!keyboardVisible && (
          <TouchableOpacity
            style={[styles.botaoEtapa, !podeEmbarcar && styles.botaoEtapaDesativado]}
            onPress={() => {
              if (!podeEmbarcar) {
                Alert.alert(
                  'Atenção',
                  'Ainda existem itens com quantidade definida que não foram totalmente separados.'
                );
                return;
              }
              navigation.navigate('VisualizarVolumesScreen', { ordem });
            }}
            disabled={!podeEmbarcar}
          >
            <Text style={[styles.textoBotao, !podeEmbarcar && { color: '#ecf0f1' }]}>Volumes</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  titulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cliente: { fontSize: 14, color: '#333', marginBottom: 12 },
  progressoContainer: {
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 6,
    overflow: 'hidden',
    margin: 16,
  },
  barraProgresso: { height: '100%', backgroundColor: '#27ae60' },
  textoProgresso: { fontSize: 12, color: '#333', marginHorizontal: 16, marginBottom: 8 },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  codigo: { fontWeight: 'bold', fontSize: 14 },
  statusTag: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  form: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  botao: {
    backgroundColor: '#2ecc71',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  textoBotao: { color: '#fff', fontWeight: 'bold' },
  botaoEditar: {
    backgroundColor: '#f39c12',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  textoEditar: { color: '#fff', fontWeight: 'bold' },
  botaoEtapa: {
    backgroundColor: '#27ae60',
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botaoEtapaDesativado: {
    backgroundColor: '#95a5a6',
  },
});

export default DetalheOrdemScreen;
