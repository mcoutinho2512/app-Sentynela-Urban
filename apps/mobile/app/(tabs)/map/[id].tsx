import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useIncident, useVoteIncident, useComments, useAddComment } from "@/hooks/useIncidents";
import { VoteButtons } from "@/components/incidents/VoteButtons";
import { CommentList } from "@/components/incidents/CommentList";
import { Colors, Spacing, FontSize, SeverityColors, BorderRadius } from "@/constants/theme";
import { Button } from "@/components/ui/Button";
import { API_URL } from "@/constants/env";

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const incidentId = Number(id);

  const { data: incident, isLoading, refetch } = useIncident(incidentId);
  const { data: comments, refetch: refetchComments } = useComments(incidentId);
  const voteMutation = useVoteIncident(incidentId);
  const addCommentMutation = useAddComment(incidentId);
  const [commentText, setCommentText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchComments()]);
    setRefreshing(false);
  }, [refetch, refetchComments]);

  const handleVote = async (vote: string) => {
    try {
      await voteMutation.mutateAsync(vote);
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao votar");
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addCommentMutation.mutateAsync(commentText.trim());
      setCommentText("");
    } catch (err: any) {
      Alert.alert("Erro", err?.response?.data?.detail || "Falha ao comentar");
    }
  };

  if (isLoading || !incident) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const severityColor = SeverityColors[incident.severity as keyof typeof SeverityColors] || Colors.textSecondary;

  const getPhotoUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${API_URL}${url}`;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <View style={styles.header}>
          <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
            <Text style={styles.severityText}>{incident.severity}</Text>
          </View>
          <Text style={styles.type}>{incident.type}</Text>
          <Text style={styles.status}>{incident.status}</Text>
        </View>

        {incident.description && (
          <Text style={styles.description}>{incident.description}</Text>
        )}

        {incident.photo_url && (
          <Image
            source={{ uri: getPhotoUrl(incident.photo_url) }}
            style={styles.photo}
            resizeMode="cover"
          />
        )}

        <VoteButtons
          confirmations={incident.confirmations}
          refutations={incident.refutations}
          userVote={incident.user_vote}
          onVote={handleVote}
          loading={voteMutation.isPending}
        />

        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comentarios ({comments?.length ?? 0})
          </Text>
          <CommentList comments={comments ?? []} />
        </View>
      </ScrollView>

      <View style={styles.commentInput}>
        <TextInput
          style={styles.input}
          placeholder="Adicionar comentario..."
          placeholderTextColor={Colors.textSecondary}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <Button
          title="Enviar"
          onPress={handleAddComment}
          loading={addCommentMutation.isPending}
          compact
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  severityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  severityText: {
    color: "#fff",
    fontSize: FontSize.xs,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  type: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.text,
    flex: 1,
  },
  status: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textTransform: "capitalize",
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
  },
  photo: {
    width: "100%",
    height: 220,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
  },
  commentsSection: {
    gap: Spacing.sm,
  },
  commentsTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.text,
  },
  commentInput: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.text,
    maxHeight: 100,
  },
});
