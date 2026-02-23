import { ScrollView, Text, StyleSheet, View } from "react-native";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Politica de Privacidade</Text>
      <Text style={styles.date}>Ultima atualizacao: 22 de fevereiro de 2026</Text>

      <View style={styles.section}>
        <Text style={styles.heading}>1. Introducao</Text>
        <Text style={styles.text}>
          O Sentynela ("nos", "nosso") e um aplicativo de seguranca urbana colaborativa. Esta Politica de Privacidade
          descreve como coletamos, usamos, armazenamos e protegemos suas informacoes pessoais, em conformidade com a
          Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>2. Dados que coletamos</Text>
        <Text style={styles.text}>
          {"\u2022"} Dados de cadastro: nome, email e senha (armazenada de forma criptografada){"\n"}
          {"\u2022"} Localizacao: coordenadas GPS para exibir incidentes proximos e calcular rotas{"\n"}
          {"\u2022"} Fotos: imagens capturadas pela camera para relatos de incidentes{"\n"}
          {"\u2022"} Locais salvos: enderecos de casa, trabalho e favoritos que voce cadastrar{"\n"}
          {"\u2022"} Dados de uso: interacoes com o aplicativo para melhorar a experiencia
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>3. Como usamos seus dados</Text>
        <Text style={styles.text}>
          {"\u2022"} Exibir incidentes e alertas proximos a sua localizacao{"\n"}
          {"\u2022"} Calcular rotas seguras com base em ocorrencias{"\n"}
          {"\u2022"} Permitir o registro e visualizacao de relatos de incidentes{"\n"}
          {"\u2022"} Enviar notificacoes de alertas na sua area de monitoramento{"\n"}
          {"\u2022"} Conectar voce a prestadores de servicos locais{"\n"}
          {"\u2022"} Melhorar a seguranca e funcionalidade do aplicativo
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>4. Base legal (LGPD)</Text>
        <Text style={styles.text}>
          O tratamento dos seus dados pessoais e realizado com base no seu consentimento (Art. 7, I da LGPD) e na
          execucao do contrato de uso do aplicativo (Art. 7, V da LGPD). Voce pode revogar seu consentimento a
          qualquer momento.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>5. Compartilhamento de dados</Text>
        <Text style={styles.text}>
          Seus dados pessoais nao sao vendidos a terceiros. Podemos compartilhar dados anonimizados e agregados para
          fins estatisticos. Relatos de incidentes (sem dados pessoais identificaveis) sao visiveis para outros
          usuarios na area.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>6. Armazenamento e seguranca</Text>
        <Text style={styles.text}>
          {"\u2022"} Senhas sao armazenadas com hash criptografico (bcrypt){"\n"}
          {"\u2022"} Tokens de autenticacao sao armazenados no Keychain (iOS) ou Keystore (Android){"\n"}
          {"\u2022"} A comunicacao com nossos servidores e protegida por HTTPS/TLS{"\n"}
          {"\u2022"} Seus dados sao armazenados em servidores seguros no Brasil
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>7. Seus direitos (LGPD)</Text>
        <Text style={styles.text}>
          Voce tem direito a:{"\n"}
          {"\u2022"} Confirmar a existencia de tratamento de dados{"\n"}
          {"\u2022"} Acessar seus dados pessoais{"\n"}
          {"\u2022"} Corrigir dados incompletos ou desatualizados{"\n"}
          {"\u2022"} Solicitar a exclusao dos seus dados{"\n"}
          {"\u2022"} Revogar o consentimento a qualquer momento{"\n"}
          {"\u2022"} Solicitar a portabilidade dos dados{"\n\n"}
          Para exercer seus direitos, utilize a opcao "Excluir minha conta" no perfil ou entre em contato pelo email
          abaixo.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>8. Retencao de dados</Text>
        <Text style={styles.text}>
          Seus dados pessoais sao mantidos enquanto sua conta estiver ativa. Ao excluir sua conta, todos os dados
          pessoais serao removidos em ate 30 dias, exceto quando houver obrigacao legal de retencao.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>9. Contato</Text>
        <Text style={styles.text}>
          Para duvidas sobre esta politica ou sobre seus dados pessoais, entre em contato:{"\n\n"}
          Email: privacidade@appsentynela.com.br{"\n"}
          Responsavel: Encarregado de Protecao de Dados (DPO)
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Sentynela - Seguranca Urbana Colaborativa
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
  },
  date: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heading: {
    fontSize: FontSize.md,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  text: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 22,
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
