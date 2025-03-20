import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// 👉 Função para formatar a data como "23-09-2024 08:00am"
const formatarDataHora = (dataString) => {
  const data = new Date(dataString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();

  let horas = data.getHours();
  const minutos = String(data.getMinutes()).padStart(2, '0');
  const ampm = horas >= 12 ? 'pm' : 'am';
  horas = horas % 12;
  horas = horas ? horas : 12; // 0h vira 12

  return `${dia}-${mes}-${ano} ${horas}:${minutos}${ampm}`;
};

const OrdemCard = ({ ordem, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.titulo}>Contrato: {ordem.contrato}</Text>
      <Text>Cliente: {ordem.cliente || 'Cliente não informado'}</Text>
      <Text>Carga: {ordem.carga}</Text>
      <Text>Obra: {ordem.obra}</Text>
      <Text>Entrega: {formatarDataHora(ordem.data_hora_entrega)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    marginVertical: 8,
    borderRadius: 10,
    elevation: 2,
  },
  titulo: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
});

export default OrdemCard;
