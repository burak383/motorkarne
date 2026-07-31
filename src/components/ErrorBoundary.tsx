import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Not: Bu sınıf bileşeni React'in hata sınırı (error boundary) mekanizmasını
// kullanır. React henüz bunun için bir Hook karşılığı sunmadığından, bir class
// component olarak yazılması gerekir. Uygulamanın herhangi bir yerinde
// beklenmeyen bir render hatası oluşursa (örn. bozuk bir görsel URL'i, boş
// veri vb.) tüm uygulamanın beyaz ekrana düşmesini engeller.
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Gerçek bir uygulamada burada Sentry/Crashlytics gibi bir hata izleme
    // servisine bildirim gönderilir.
    console.error('MotorKarne - yakalanmamış hata:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <AlertTriangle size={40} color="#ef4444" style={{ marginBottom: 16 }} />
            <Text style={styles.title}>Bir şeyler ters gitti</Text>
            <Text style={styles.desc}>
              Beklenmeyen bir hata oluştu. Tekrar denemek uygulamayı normal haline döndürebilir.
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <Text style={styles.buttonText}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '700', color: '#f8fafc', textAlign: 'center' },
  desc: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  button: {
    marginTop: 24,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#4c7cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
});
