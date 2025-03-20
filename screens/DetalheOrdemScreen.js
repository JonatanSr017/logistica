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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';

const DetalheOrdemScreen = ({ route }) => {
  const navigation = useNavigation();
  const { ordem } = route.params;
  const [itens, setItens] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [modoEdicao, setModoEdicao] = useState({});
  const [loading, setLoading] = useState(true);

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
    buscarItens();
  }, []);

  const confirmarQuantidade = async (item) => {
    let entrada = quantidades[item.id];
    if (entrada === '' || entrada === null || entrada === undefined) {
      entrada = 0;
    }

    const novaQtde = parseInt(entrada);
    const antigaQtde = item.qtde_definida || 0;
    const saldoAtual = item.carga;

    if (isNaN(novaQtde) || novaQtde < 0) {
      Alert.alert('Atenção', 'Informe uma quantidade válida (0 ou mais).');
      return;
    }

    const novaCarga = saldoAtual + antigaQtde - novaQtde;

    if (novaQtde > saldoAtual + antigaQtde) {
      Alert.alert('Erro', 'Quantidade não pode ser maior que o saldo disponível.');
      return;
    }

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

    const { error } = await supabase
      .from('itens_ordem')
      .update({
        qtde_definida: novaQtde,
        carga: novaCarga,
        saldo_separar: novaQtde,
      })
      .eq('id', item.id);

    if (error) {
      Alert.alert('Erro ao salvar', error.message);
    } else {
      setItens((prevItens) =>
        prevItens.map((i) =>
          i.id === item.id ? { ...i, qtde_definida: novaQtde, carga: novaCarga, saldo_separar: novaQtde } : i
        )
      );
      setModoEdicao({ ...modoEdicao, [item.id]: false });
      Alert.alert('Sucesso', `Quantidade de ${item.codigo} atualizada para ${novaQtde}.`);
    }
  };

  const handleCarregarTudo = async () => {
    const todosDefinidos = itens.every((item) => item.qtde_definida > 0);

    const pergunta = todosDefinidos
      ? 'Deseja cancelar a carga completa e redefinir todas as quantidades?'
      : 'Tem certeza que deseja definir todas as quantidades como iguais ao saldo a carregar?';

    const continuar = await new Promise((resolve) => {
      Alert.alert(
        'Carregar tudo',
        pergunta,
        [
          { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
          { text: 'Confirmar', onPress: () => resolve(true) },
        ]
      );
    });

    if (!continuar) return;

    const updates = itens.map((item) => {
      const cargaTotal = item.qtde_definida + item.carga;
      if (todosDefinidos) {
        return {
          id: item.id,
          qtde_definida: 0,
          carga: cargaTotal,
          saldo_separar: 0,
        };
      } else {
        return {
          id: item.id,
          qtde_definida: cargaTotal,
          carga: 0,
          saldo_separar: cargaTotal,
        };
      }
    });

    for (const update of updates) {
      await supabase
        .from('itens_ordem')
        .update({
          qtde_definida: update.qtde_definida,
          carga: update.carga,
          saldo_separar: update.saldo_separar,
        })
        .eq('id', update.id);
    }

    buscarItens();
    Alert.alert('Pronto', todosDefinidos ? 'Carga total cancelada.' : 'Todos os itens foram definidos com o saldo disponível.');
  };

  const handleContinuarSeparacao = () => {
    const selecionados = itens.filter((item) => item.qtde_definida > 0);

    if (selecionados.length === 0) {
      Alert.alert('Atenção', 'Você precisa definir ao menos uma peça para separar.');
      return;
    }

    Alert.alert('🚧', 'Aqui vai a próxima tela de separação por volume.');
  };

  const renderItem = ({ item }) => {
    const emEdicao = modoEdicao[item.id];
    return (
      <View key={item.id} style={styles.card}>
        <Text style={styles.codigo}>
          Código: {item.codigo} {item.qtde_definida > 0 && !emEdicao ? '✅' : ''}
        </Text>
        <Text>Descrição: {item.descricao}</Text>
        <Text>Saldo a Carregar: {item.carga}</Text>
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
            <TouchableOpacity
              style={styles.botao}
              onPress={() => confirmarQuantidade(item)}
            >
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
              <Text style={styles.textoEditar}>Editar</Text>
            </TouchableOpacity>

            {item.qtde_definida > 0 && (
              <TouchableOpacity
                style={[styles.botaoEditar, { backgroundColor: '#2980b9' }]}
                onPress={() => navigation.navigate('SepararVolume', { item, ordem })}
              >
                <Text style={styles.textoEditar}>Separar Volume</Text>
              </TouchableOpacity>
            )}
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
      <View style={styles.container}>
        <Text style={styles.titulo}>Itens da Ordem {ordem.contrato}</Text>
        <Text numberOfLines={1} style={styles.cliente}>{ordem.cliente}</Text>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1 }}>
            {loading ? (
              <ActivityIndicator size="large" color="#0000ff" />
            ) : (
              itens.map((item) => renderItem({ item }))
            )}
          </View>
        </ScrollView>

        {!loading && (
          <View style={styles.rodape}>
            <TouchableOpacity
              style={styles.botaoCaminhao}
              onPress={handleCarregarTudo}
            >
              <Text style={styles.iconeCaminhao}>🚚</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botaoSeparacao}
              onPress={handleContinuarSeparacao}
            >
              <Text style={styles.textoBotao}>Continuar Separação</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cliente: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
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
  textoBotao: {
    color: '#fff',
    fontWeight: 'bold',
  },
  botaoEditar: {
    backgroundColor: '#f39c12',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  textoEditar: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
  },
  botaoCaminhao: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  iconeCaminhao: {
    fontSize: 24,
    color: '#fff',
  },
  botaoSeparacao: {
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
});

export default DetalheOrdemScreen;