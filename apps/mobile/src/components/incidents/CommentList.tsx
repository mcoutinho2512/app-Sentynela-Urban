import { View, Text, StyleSheet, FlatList } from "react-native";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

interface Comment {
  id: number;
  user_name: string;
  text: string;
  created_at: string;
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min atras`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h atras`;
    return `${Math.floor(hours / 24)}d atras`;
  };

  if (comments.length === 0) {
    return (
      <Text style={styles.empty}>Nenhum comentario ainda</Text>
    );
  }

  return (
    <View style={styles.list}>
      {comments.map((comment) => (
        <View key={comment.id} style={styles.comment}>
          <View style={styles.header}>
            <Text style={styles.author}>{comment.user_name}</Text>
            <Text style={styles.time}>{timeAgo(comment.created_at)}</Text>
          </View>
          <Text style={styles.text}>{comment.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
  },
  empty: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  comment: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  author: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.text,
  },
  time: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  text: {
    fontSize: FontSize.sm,
    color: Colors.text,
    lineHeight: 20,
  },
});
