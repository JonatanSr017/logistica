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
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

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
  const [cargaTotalAtiva, setCargaTotalAtiva] = useState(false);

  // Adicionar listeners para o teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const buscarUsuario = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setUsuario(data.user);
  };

  const buscarItens = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('itens_ordem')
      .select('*')
      .eq('chave_contrato_carga_obra', ordem.chave_contrato_carga_obra)
      .order('descricao', { ascending: true });

    if (error) {
      Alert.alert('Erro ao buscar itens', error.message);
    } else {
      // Garantir que os campos numéricos estejam corretos
      const itensFormatados = data.map(item => ({
        ...item,
        qtde_definida: Number(item.qtde_definida) || 0,
        qtde_separada: Number(item.qtde_separada) || 0,
        carga: Number(item.carga) || 0,
        saldo_separar: Number(item.saldo_separar) || 0
      }));
      setItens(itensFormatados);
    }
    setLoading(false);
  };

  useEffect(() => {
    buscarUsuario();
    buscarItens();
  }, []);

  useEffect(() => {
    const verificarProgresso = () => {
      const itensComQtde = itens.filter((item) => item.qtde_definida > 0);
      const total = itensComQtde.length;
      const concluidos = itensComQtde.filter(
        (item) => item.qtde_separada >= item.qtde_definida
      ).length;

      const todosSeparados = total > 0 && concluidos === total;
      setPodeEmbarcar(todosSeparados);

      const porcentagem = total > 0 ? Math.round((concluidos / total) * 100) : 0;
      setPorcentagemSeparacao(porcentagem);
    };

    verificarProgresso();
  }, [itens]);

  const atualizarQuantidadeItem = async (itemId, novaQuantidade) => {
    const { error } = await supabase
      .from('itens_ordem')
      .update({ qtde_definida: novaQuantidade })
      .eq('id', itemId);

    return error;
  };

  const excluirVolumesEFotos = async (itemId) => {
    // Supondo que exista uma tabela 'volumes' relacionada
    const { error } = await supabase
      .from('volumes')
      .delete()
      .eq('item_id', itemId);

    if (error) {
      Alert.alert('Erro ao excluir volumes', error.message);
      return false;
    }
    return true;
  };

  const confirmarQuantidade = async (item) => {
    const novaQtde = parseInt(quantidades[item.id]) || 0;
    
    if (novaQtde < 0) {
      Alert.alert('Erro', 'A quantidade não pode ser negativa');
      return;
    }

    if (novaQtde > item.carga) {
      Alert.alert('Erro', 'A quantidade não pode exceder o saldo do contrato');
      return;
    }

    const error = await atualizarQuantidadeItem(item.id, novaQtde);
    if (error) {
      Alert.alert('Erro', error.message);
    } else {
      setModoEdicao({ ...modoEdicao, [item.id]: false });
      buscarItens(); // Atualiza a lista após salvar
    }
  };

  const aplicarSaldoACarregar = async () => {
    const confirmar = await new Promise((resolve) => {
      Alert.alert(
        cargaTotalAtiva ? 'Cancelar definição automática' : 'Confirmar definição automática',
        cargaTotalAtiva
          ? 'Deseja cancelar a definição de carga total e restaurar os valores anteriores?'
          : 'Deseja definir a quantidade de todas as peças com o saldo a carregar? Todos os volumes existentes serão excluídos.',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: cargaTotalAtiva ? 'Sim, cancelar' : 'Sim, aplicar', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmar) return;

    setLoading(true);
    if (cargaTotalAtiva) {
      // Reverter para 0 ou valor inicial desejado
      for (const item of itens) {
        const error = await atualizarQuantidadeItem(item.id, 0);
        if (error) {
          Alert.alert('Erro ao cancelar carga', `Erro no item ${item.codigo}: ${error.message}`);
          setLoading(false);
          return;
        }
      }
      setCargaTotalAtiva(false);
      Alert.alert('Sucesso', 'A carga total foi cancelada.');
    } else {
      for (const item of itens) {
        const novaQtde = item.carga;
        if (novaQtde !== item.qtde_definida) {
          const sucesso = await excluirVolumesEFotos(item.id);
          if (!sucesso) {
            setLoading(false);
            return;
          }
        }

        const error = await atualizarQuantidadeItem(item.id, novaQtde);
        if (error) {
          Alert.alert('Erro ao aplicar saldo', `Erro no item ${item.codigo}: ${error.message}`);
          setLoading(false);
          return;
        }
      }
      setCargaTotalAtiva(true);
      Alert.alert('Sucesso', 'Quantidade atualizada com o saldo a carregar.');
    }
    await buscarItens();
    setLoading(false);
  };

  const renderItem = (item) => {
    const emEdicao = modoEdicao[item.id];
    const entradaAtual = quantidades[item.id] !== undefined
      ? parseInt(quantidades[item.id]) || 0
      : item.qtde_definida || 0;

    const saldoACarregar = item.carga - entradaAtual;
    const faltamSeparar = item.qtde_definida - item.qtde_separada;

    let statusCor = '#ccc';
    let statusTexto = '🔴 Não definido';

    if (item.qtde_definida > 0 && item.qtde_separada >= item.qtde_definida) {
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
        <Text>Saldo do Contrato: {saldoACarregar}</Text>
        <Text>Quantidade Definida: {item.qtde_definida || 0}</Text>
        <Text>Faltam separar: {faltamSeparar} peças</Text>

        {emEdicao ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Nova quantidade"
              value={quantidades[item.id]?.toString() || ''}
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
                    item.qtde_definida > 0 && faltamSeparar > 0 ? '#2980b9' : '#ccc',
                },
              ]}
              onPress={() => {
                if (item.qtde_definida === 0) {
                  Alert.alert('Atenção', 'Defina uma quantidade antes de separar o volume.');
                } else if (faltamSeparar <= 0) {
                  Alert.alert('Atenção', 'Todos os volumes deste item já foram separados.');
                } else {
                  navigation.navigate('SepararVolume', { item, ordem });
                }
              }}
              disabled={item.qtde_definida === 0 || faltamSeparar <= 0}
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
            ) : itens.length > 0 ? (
              itens.map((item) => renderItem(item))
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 20 }}>Nenhum item encontrado</Text>
            )}
          </View>
        </ScrollView>

        {!keyboardVisible && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', margin: 16 }}>
            <TouchableOpacity
              style={[styles.botaoEtapa, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={aplicarSaldoACarregar}
            >
              <FontAwesome5 name="truck" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.textoBotao}>{cargaTotalAtiva ? 'Cancelar Carga Total' : 'Carga Total'}</Text>
            </TouchableOpacity>

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
          </View>
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
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  botaoEtapaDesativado: {
    backgroundColor: '#95a5a6',
  },
});

export default DetalheOrdemScreen;