import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  Image,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Search,
  AlertTriangle,
  UploadCloud,
  ImageIcon,
  ArrowUp,
  Database,
  ShieldAlert,
} from 'lucide-react-native';
import { fonts, radius } from '../theme/theme';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { Motor, ChronicIssue, getVehicleById } from '../data/catalog';
import { useFavorites } from '../state/FavoritesContext';
import { useCatalog } from '../state/CatalogContext';
import { useMembers } from '../state/MembersContext';
import { useNotifications } from '../state/NotificationsContext';
import { getRiskInfo } from '../utils/risk';

export default function AdminPaneliScreen() {
  const nav = useNavigation();
  const { themeColors: colors } = useTheme();
  const { t } = useLanguage();
  const { currentUser } = useMembers();
  const { addNotification } = useNotifications();
  const { savedVehicles } = useFavorites();

  const isMotorFollowed = (motorId: string) =>
    savedVehicles.some((sv) => getVehicleById(sv.vehicleId)?.motorId === motorId);

  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y > 200) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const { motors: motorList, addMotor, updateMotor, deleteMotor, getMotorById } = useCatalog();
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formFuel, setFormFuel] = useState('Benzin');
  const [formPower, setFormPower] = useState('');
  const [formTorque, setFormTorque] = useState('');
  const [formTransmission, setFormTransmission] = useState('');
  const [formConsumption, setFormConsumption] = useState('');
  const [formScore, setFormScore] = useState('7.5');
  const [formNote, setFormNote] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');

  const [formPros, setFormPros] = useState<string[]>([]);
  const [newProInput, setNewProInput] = useState('');

  const [formCons, setFormCons] = useState<string[]>([]);
  const [newConInput, setNewConInput] = useState('');

  const [formChronic, setFormChronic] = useState<ChronicIssue[]>([]);
  const [chronicTitle, setChronicTitle] = useState('');
  const [chronicRisk, setChronicRisk] = useState('Orta Risk');
  const [chronicDesc, setChronicDesc] = useState('');
  const [chronicSolution, setChronicSolution] = useState('');

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin Gerekli', 'Görsel seçebilmek için galeri erişim izni vermeniz gerekmektedir.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFormImageUrl(result.assets[0].uri);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormName('');
    setFormCode('');
    setFormBrand('');
    setFormFuel('Benzin');
    setFormPower('130 HP');
    setFormTorque('230 Nm');
    setFormTransmission('8-İleri Otomatik');
    setFormConsumption('5.5 L / 100 km');
    setFormScore('7.5');
    setFormNote('');
    setFormImageUrl('');
    setFormPros([]);
    setFormCons([]);
    setFormChronic([]);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Motor) => {
    setEditingId(item.id);
    setFormName(item.name || '');
    setFormCode(item.code || '');
    setFormBrand(item.brands ? item.brands.join(', ') : '');
    setFormFuel(item.fuel || 'Benzin');
    setFormPower(item.power || '');
    setFormTorque(item.torque || '');
    setFormTransmission(item.transmission || '');
    setFormConsumption(item.consumption || '');
    setFormScore(String(item.score || 7.0));
    setFormNote(item.note || '');
    setFormImageUrl(item.imageUrl || '');
    setFormPros(item.pros || []);
    setFormCons(item.cons || []);
    setFormChronic(item.chronic || []);
    setIsModalOpen(true);
  };

  const addProItem = () => {
    if (newProInput.trim()) {
      setFormPros([...formPros, newProInput.trim()]);
      setNewProInput('');
    }
  };

  const addConItem = () => {
    if (newConInput.trim()) {
      setFormCons([...formCons, newConInput.trim()]);
      setNewConInput('');
    }
  };

  const addChronicItem = () => {
    if (chronicTitle.trim() && chronicDesc.trim()) {
      setFormChronic([
        ...formChronic,
        {
          title: chronicTitle.trim(),
          risk: chronicRisk,
          desc: chronicDesc.trim(),
          solution: chronicSolution.trim() || undefined,
        },
      ]);
      setChronicTitle('');
      setChronicDesc('');
      setChronicSolution('');
    }
  };

  const handleSave = () => {
    if (!formName.trim()) {
      Alert.alert('Hata', 'Lütfen motor / araç adını girin.');
      return;
    }
    const oldMotor = editingId ? getMotorById(editingId) : null;
    const brandArray = formBrand ? formBrand.split(',').map((b) => b.trim()) : ['Genel'];
    const numericScore = parseFloat(formScore) || 7.0;
    const computedRisk = getRiskInfo(numericScore);
    const riskLevelMap = { 'very-high': 'high', high: 'high', medium: 'medium', low: 'low' } as const;

    const updatedMotorData: Motor = {
      id: editingId || String(Date.now()),
      name: formName,
      code: formCode || 'N/A',
      brands: brandArray,
      fuel: formFuel,
      power: formPower,
      torque: formTorque,
      transmission: formTransmission,
      consumption: formConsumption,
      score: numericScore,
      risk: computedRisk.label,
      riskLevel: riskLevelMap[computedRisk.tier],
      note: formNote,
      pros: formPros,
      cons: formCons,
      chronic: formChronic,
      imageUrl: formImageUrl || undefined,
    };

    const result = editingId
      ? updateMotor(editingId, updatedMotorData)
      : addMotor(updatedMotorData);

    if (!result.success) {
      Alert.alert('Hata', result.error ?? 'Kayıt işlemi başarısız oldu.');
      return;
    }

    if (editingId) {
      addNotification('Motor güncellendi', `${updatedMotorData.name} bilgileri güncellendi.`);

      if (isMotorFollowed(editingId)) {
        const oldTitles = new Set((oldMotor?.chronic ?? []).map((c) => c.title));
        const newIssues = updatedMotorData.chronic.filter((c) => !oldTitles.has(c.title));
        newIssues.forEach((issue) => {
          addNotification(
            `${updatedMotorData.name} için yeni bir kronik sorun eklendi`,
            `${issue.title}: ${issue.desc}`
          );
        });
      }
    } else {
      addNotification('Yeni motor eklendi', `${updatedMotorData.name} kataloğa eklendi.`);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t.deleteBtn, t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.deleteBtn,
        style: 'destructive',
        onPress: () => {
          deleteMotor(id);
        },
      },
    ]);
  };

  const filteredMotors = motorList.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser?.isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <ShieldAlert size={40} color={colors.destructive} style={{ marginBottom: 16 }} />
          <Text
            style={{
              fontFamily: fonts.heading.bold,
              fontSize: 18,
              color: colors.foreground,
              textAlign: 'center',
            }}
          >
            Erişim Yetkiniz Yok
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.mutedForeground,
              textAlign: 'center',
              marginTop: 8,
              lineHeight: 19,
            }}
          >
            Bu sayfayı görüntülemek için yönetici hesabıyla giriş yapmanız gerekir.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 24,
              height: 48,
              paddingHorizontal: 24,
              borderRadius: radius,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => nav.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Geri Dön"
          >
            <Text style={{ fontFamily: fonts.body.bold, fontSize: 14, color: colors.primaryForeground }}>
              Geri Dön
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Header */}
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity style={s.iconBtn} onPress={() => nav.goBack()} accessibilityRole="button" accessibilityLabel="Geri">
            <ArrowLeft size={20} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.foreground }]}>{t.adminPanelTitle}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[s.iconBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={() => nav.navigate('VeriYonetimi' as never)}
            >
              <Database size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openAddModal}>
              <Plus size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Arama Barı */}
        <View style={{ paddingHorizontal: 20, marginVertical: 12 }}>
          <View style={[s.searchBox, { borderColor: colors.border, backgroundColor: colors.input }]}>
            <Search size={18} color={colors.mutedForeground} />
            <TextInput
              style={[s.searchInput, { color: colors.foreground }]}
              placeholder={t.searchPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Ürün Listesi */}
        <ScrollView
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <View style={{ gap: 10 }}>
            {filteredMotors.map((item) => (
              <View key={item.id} style={[s.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={s.cardThumb} resizeMode="cover" />
                ) : (
                  <View style={[s.cardThumbPlaceholder, { backgroundColor: colors.muted }]}>
                    <ImageIcon size={20} color={colors.mutedForeground} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.cardTitle, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[s.cardSub, { color: colors.mutedForeground }]}>
                    {item.fuel} • {item.power} • {item.brands ? item.brands.join(', ') : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <Text style={[s.scoreBadge, { color: colors.primary }]}>★ {item.score}</Text>
                    <Text style={[s.riskText, { color: colors[getRiskInfo(item.score).colorKey] }]}>
                      {getRiskInfo(item.score).label}
                    </Text>
                  </View>
                </View>

                {/* Aksiyon Butonları */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => openEditModal(item)}
                  >
                    <Edit2 size={16} color={colors.secondaryForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.muted }]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Trash2 size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {showScrollTop && (
          <TouchableOpacity
            style={[s.scrollTopBtn, { backgroundColor: colors.primary, borderColor: colors.border }]}
            onPress={scrollToTop}
            accessibilityRole="button"
            accessibilityLabel="Yukarı kaydır"
            activeOpacity={0.8}
          >
            <ArrowUp size={22} color={colors.primaryForeground} />
          </TouchableOpacity>
        )}

        {/* Modal Form */}
        <Modal visible={isModalOpen} animationType="slide" transparent>
          <View style={s.modalOverlay}>
            <View style={[s.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.modalHeader}>
                <Text style={[s.modalTitle, { color: colors.foreground }]}>
                  {editingId ? 'Motor / Ürün Düzenle' : 'Yeni Motor / Ürün Ekle'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                  <X size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ marginTop: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* 📸 GÖRSEL YÜKLEME ALANI */}
                <Text style={s.sectionHeader}>1. ÜRÜN GÖRSELİ</Text>
                
                <TouchableOpacity 
                  style={[s.uploadBox, { borderColor: colors.border, backgroundColor: colors.input }]}
                  onPress={pickImage}
                >
                  {formImageUrl ? (
                    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                      <Image source={{ uri: formImageUrl }} style={s.uploadedImage} resizeMode="cover" />
                      <TouchableOpacity 
                        style={s.removeImageBtn} 
                        onPress={() => setFormImageUrl('')}
                      >
                        <X size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', gap: 6 }}>
                      <UploadCloud size={28} color={colors.primary} />
                      <Text style={[s.uploadText, { color: colors.foreground }]}>Cihazdan Fotoğraf Yükle</Text>
                      <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Galerinizden bir araç/motor fotoğrafı seçin</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <Text style={[s.label, { color: colors.mutedForeground, marginTop: 10 }]}>Veya Görsel URL Yapıştırın</Text>
                <TextInput
                  style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  value={formImageUrl}
                  onChangeText={setFormImageUrl}
                  placeholder="https://fwtngjyirchhhysukjxi..."
                  placeholderTextColor={colors.mutedForeground}
                />

                {/* Temel Bilgiler */}
                <Text style={[s.sectionHeader, { marginTop: 20 }]}>2. TEMEL BİLGİLER</Text>

                <Text style={[s.label, { color: colors.mutedForeground }]}>Motor / Ürün Adı</Text>
                <TextInput
                  style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Örn: 1.5 TSI EVO 150 hp"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[s.label, { color: colors.mutedForeground, marginTop: 10 }]}>Motor Kodu</Text>
                <TextInput
                  style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  value={formCode}
                  onChangeText={setFormCode}
                  placeholder="Örn: EA211 EVO / EB2DT"
                  placeholderTextColor={colors.mutedForeground}
                />

                <Text style={[s.label, { color: colors.mutedForeground, marginTop: 10 }]}>Markalar (Virgülle Ayırın)</Text>
                <TextInput
                  style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  value={formBrand}
                  onChangeText={setFormBrand}
                  placeholder="Örn: VW, Audi, Skoda, Seat"
                  placeholderTextColor={colors.mutedForeground}
                />

                {/* Teknik Özellikler */}
                <Text style={[s.sectionHeader, { marginTop: 20 }]}>3. TEKNİK ÖZELLİKLER</Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: colors.mutedForeground }]}>Güç (HP)</Text>
                    <TextInput
                      style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                      value={formPower}
                      onChangeText={setFormPower}
                      placeholder="150 HP"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: colors.mutedForeground }]}>Tork (Nm)</Text>
                    <TextInput
                      style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                      value={formTorque}
                      onChangeText={setFormTorque}
                      placeholder="250 Nm"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                <Text style={[s.label, { color: colors.mutedForeground, marginTop: 10 }]}>Şanzıman / Vites Tipi</Text>
                <TextInput
                  style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  value={formTransmission}
                  onChangeText={setFormTransmission}
                  placeholder="Örn: 7-İleri DSG (DQ200) / EAT8"
                  placeholderTextColor={colors.mutedForeground}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: colors.mutedForeground }]}>Yakıt Türü</Text>
                    <TextInput
                      style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                      value={formFuel}
                      onChangeText={setFormFuel}
                      placeholder="Benzin / Dizel / Hibrit"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: colors.mutedForeground }]}>Ort. Tüketim</Text>
                    <TextInput
                      style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                      value={formConsumption}
                      onChangeText={setFormConsumption}
                      placeholder="5.5 L / 100 km"
                      placeholderTextColor={colors.mutedForeground}
                    />
                  </View>
                </View>

                {/* Değerlendirme */}
                <Text style={[s.sectionHeader, { marginTop: 20 }]}>4. DEĞERLENDİRME</Text>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: colors.mutedForeground }]}>Puan (1.0 - 10.0)</Text>
                    <TextInput
                      style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                      value={formScore}
                      onChangeText={setFormScore}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.label, { color: colors.mutedForeground }]}>Risk Tanımı (otomatik)</Text>
                    <View
                      style={[
                        s.input,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.input,
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Text style={{ color: colors[getRiskInfo(parseFloat(formScore) || 0).colorKey], fontWeight: '700' }}>
                        {getRiskInfo(parseFloat(formScore) || 0).label}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[s.label, { color: colors.mutedForeground, marginTop: 10 }]}>Hızlı Karar Notu</Text>
                <TextInput
                  style={[s.input, { height: 60, borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  value={formNote}
                  onChangeText={setFormNote}
                  multiline
                  placeholder="Satın alma öncesi bilinmesi gereken özet bilgi..."
                  placeholderTextColor={colors.mutedForeground}
                />

                {/* Artılar Ekleme */}
                <Text style={[s.sectionHeader, { marginTop: 20 }]}>5. ARTILAR & EKSİLER</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[s.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                    placeholder="Artı Özellik Ekle..."
                    placeholderTextColor={colors.mutedForeground}
                    value={newProInput}
                    onChangeText={setNewProInput}
                  />
                  <TouchableOpacity style={[s.addMiniBtn, { backgroundColor: colors.success }]} onPress={addProItem}>
                    <Plus size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {formPros.map((p, index) => (
                    <View key={index} style={[s.chip, { backgroundColor: colors.muted }]}>
                      <Text style={{ fontSize: 12, color: colors.foreground }}>+ {p}</Text>
                      <TouchableOpacity onPress={() => setFormPros(formPros.filter((_, i) => i !== index))}>
                        <X size={12} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Eksiler Ekleme */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TextInput
                    style={[s.input, { flex: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                    placeholder="Eksi Özellik Ekle..."
                    placeholderTextColor={colors.mutedForeground}
                    value={newConInput}
                    onChangeText={setNewConInput}
                  />
                  <TouchableOpacity style={[s.addMiniBtn, { backgroundColor: colors.destructive }]} onPress={addConItem}>
                    <Plus size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {formCons.map((c, index) => (
                    <View key={index} style={[s.chip, { backgroundColor: colors.muted }]}>
                      <Text style={{ fontSize: 12, color: colors.foreground }}>- {c}</Text>
                      <TouchableOpacity onPress={() => setFormCons(formCons.filter((_, i) => i !== index))}>
                        <X size={12} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Kronik Sorunlar */}
                <Text style={[s.sectionHeader, { marginTop: 20 }]}>6. KRONİK SORUN EKLE</Text>
                <TextInput
                  style={[s.input, { borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  placeholder="Kronik Sorun Başlığı"
                  placeholderTextColor={colors.mutedForeground}
                  value={chronicTitle}
                  onChangeText={setChronicTitle}
                />
                <TextInput
                  style={[s.input, { marginTop: 6, borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  placeholder="Açıklama (Ne zaman yaşanır?)"
                  placeholderTextColor={colors.mutedForeground}
                  value={chronicDesc}
                  onChangeText={setChronicDesc}
                />
                <TextInput
                  style={[s.input, { marginTop: 6, borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground }]}
                  placeholder="Önerilen Çözüm"
                  placeholderTextColor={colors.mutedForeground}
                  value={chronicSolution}
                  onChangeText={setChronicSolution}
                />
                <TouchableOpacity style={[s.saveFormBtn, { backgroundColor: colors.secondary, marginTop: 8 }]} onPress={addChronicItem}>
                  <AlertTriangle size={16} color={colors.secondaryForeground} />
                  <Text style={{ color: colors.secondaryForeground, fontFamily: fonts.body.bold, fontSize: 13 }}>Kronik Sorunu Listeye Ekle</Text>
                </TouchableOpacity>

                {/* Eklenen Kronik Sorunlar */}
                <View style={{ gap: 6, marginTop: 10 }}>
                  {formChronic.map((item, index) => (
                    <View key={index} style={[s.chronicBadge, { borderColor: colors.border, backgroundColor: colors.input }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontFamily: fonts.heading.bold, fontSize: 13, color: colors.foreground }}>{item.title}</Text>
                        <Text style={{ fontSize: 11, color: colors.mutedForeground }}>{item.desc}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setFormChronic(formChronic.filter((_, i) => i !== index))}>
                        <X size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Formu Kaydet */}
                <TouchableOpacity
                  style={[s.saveFormBtn, { backgroundColor: colors.primary, marginTop: 30 }]}
                  onPress={handleSave}
                >
                  <Check size={18} color={colors.primaryForeground} />
                  <Text style={[s.saveFormText, { color: colors.primaryForeground }]}>
                    {editingId ? 'Değişiklikleri Kaydet' : 'Ürünü Kataloğa Ekle'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.heading.bold, fontSize: 18 },
  iconBtn: { padding: 4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    borderRadius: radius,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius,
    borderWidth: 1,
  },
  cardThumb: { width: 50, height: 50, borderRadius: 8 },
  cardThumbPlaceholder: { width: 50, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: fonts.heading.bold, fontSize: 14 },
  cardSub: { fontSize: 11, marginTop: 2 },
  scoreBadge: { fontSize: 12, fontFamily: fonts.body.bold },
  riskText: { fontSize: 10, fontFamily: fonts.body.bold },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontFamily: fonts.heading.bold, fontSize: 18 },
  sectionHeader: { fontSize: 11, fontFamily: fonts.body.bold, color: '#3b82f6', letterSpacing: 1.2, marginBottom: 8 },
  label: { fontSize: 11, fontFamily: fonts.body.semibold, marginBottom: 4 },
  input: {
    height: 44,
    borderRadius: radius,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  uploadBox: {
    height: 120,
    borderRadius: radius,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadText: { fontFamily: fonts.body.bold, fontSize: 13 },
  uploadedImage: { width: '100%', height: '100%' },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMiniBtn: { width: 44, height: 44, borderRadius: radius, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  chronicBadge: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: radius, borderWidth: 1 },
  saveFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: radius,
  },
  saveFormText: { fontFamily: fonts.body.bold, fontSize: 14 },
  scrollTopBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 99,
  },
});