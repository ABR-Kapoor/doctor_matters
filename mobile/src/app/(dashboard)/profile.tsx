import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Modal, Linking , RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronRight, X, LogOut, CheckCircle2, Globe, Check, MapPin, Search, Trash2 } from 'lucide-react-native';
import { useRouter, Tabs } from 'expo-router';
import { HeaderTitle } from '@/components/HeaderOptions';
import { useAuth } from '@clerk/expo';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { TranslatedText } from '@/components/TranslatedText';
import { useLanguage } from '@/lib/LanguageContext';
import { parseClinicGeo, formatClinicGeo, latLngToTile, googleTileUrl, isValidLatitude, isValidLongitude, type ClinicLocation } from '@/lib/clinicGeo';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { 
  useDoctorProfile, 
  useDoctorClinics, 
  useDoctorFinance, 
  useDoctorIdentity 
} from '@/hooks/queries/doctorQueries';
import { 
  useUpdateProfile, 
  useSaveBankDetails, 
  useRequestVerification 
} from '@/hooks/mutations/doctorMutations';
import { useNotification } from '@/lib/NotificationContext';
import { COLORS as THEME_COLORS } from '@/constants/theme';

const COLORS = {
  ...THEME_COLORS,
  primary: THEME_COLORS.primary,
  primaryLight: THEME_COLORS.badge,
  text: THEME_COLORS.text,
  background: THEME_COLORS.background,
  white: '#FFFFFF',
  gray: THEME_COLORS.gray,
  lightGray: THEME_COLORS.lightGray,
  danger: THEME_COLORS.error,
  dangerLight: '#FEE2E2',
};

const FONTS = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semiBold: 'DMSans_700Bold',
  bold: 'DMSans_700Bold',
  serif: 'DMSans_700Bold',
};

const SPECIALIZATIONS = [
  'General Physician', 'Kayachikitsa (Internal Medicine)', 'Shalya Tantra (Surgery)',
  'Shalakya Tantra (ENT & Ophthalmology)', 'Kaumara Bhritya (Pediatrics)',
  'Prasuti Tantra (Gynecology & Obstetrics)', 'Agada Tantra (Toxicology)',
  'Swasthavritta (Preventive Medicine)', 'Ayurvedic Dietetics & Nutrition',
  'Yoga & Meditation Therapy', 'Marma Chikitsa (Vital Points Therapy)',
  'Vajikarana (Aphrodisiac Therapy)', 'Ayurvedic Dermatology',
  'Ayurvedic Cardiology', 'Ayurvedic Diabetes Management',
  'Stress & Anxiety Management', 'Weight Management',
  'Digestive Health Specialist', 'Joint & Pain Management', 'Detoxification Expert',
];

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Gujarati'];

const PREFIXES = ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Shri', 'Smt.', 'Prof.'];

const TILE_SIZE = 256;
const TILE_ZOOM = 16;

interface GeocodeResult {
    label: string;
    lat: number;
    lng: number;
}

/**
 * 3x3 OpenStreetMap raster tile grid with the chosen point pinned in the
 * centre. Uses plain Image + View, so it needs no native map module.
 */
const TileMapPreview = ({ location }: { location: ClinicLocation }) => {
  const center = latLngToTile(location.latitude, location.longitude, TILE_ZOOM);
  const tiles = useMemo(() => {
    const out: { uri: string; left: number; top: number }[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = center.x + dx;
        const y = center.y + dy;
        if (x < 0 || y < 0) continue;
        out.push({
          uri: googleTileUrl(TILE_ZOOM, x, y),
          left: (dx + 1) * TILE_SIZE,
          top: (dy + 1) * TILE_SIZE,
        });
      }
    }
    return out;
  }, [center.x, center.y]);

  return (
    <TouchableOpacity style={styles.mapFrame} activeOpacity={0.8} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`)}>
      <View style={styles.mapCanvas}>
        {tiles.map((t, i) => (
          <Image key={i} source={{ uri: t.uri }} style={[styles.mapTile, { left: t.left, top: t.top }]} />
        ))}
        <View style={styles.mapMarker} pointerEvents="none">
          <MapPin size={26} color={COLORS.danger} fill={COLORS.danger} />
        </View>
      </View>
      <Text style={styles.mapAttribution}>© Google Maps</Text>
    </TouchableOpacity>
  );
};


const TagInput = ({ tags, onChange, placeholder, options }: { tags: string[], onChange: (tags: string[]) => void, placeholder: string, options: string[] }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleTag = (val: string) => {
    if (tags.includes(val)) {
      onChange(tags.filter(t => t !== val));
    } else {
      onChange([...tags, val]);
    }
  };

  return (
    <>
      <View style={styles.tagSection}>
        <View style={styles.tagList}>
          {tags.map((tag, index) => (
            <View key={index} style={styles.tagPill}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity onPress={() => onChange(tags.filter(t => t !== tag))} style={{ padding: 2 }}>
                <X size={12} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addTagBtn}>
            <Text style={styles.addTagText}>{tags.length === 0 ? placeholder : "+ Add"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={{ width: 40, height: 4, borderRadius: 12, backgroundColor: COLORS.lightGray, marginBottom: 16 }} />
                <Text style={[styles.pickerTitle]}><TranslatedText>Select Options</TranslatedText></Text>
            <ScrollView style={{ width: '100%', maxHeight: 400 }}>
              {options.map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  style={styles.pickerOption}
                  onPress={() => toggleTag(opt)}
                >
                  <Text style={[styles.pickerOptionText, tags.includes(opt) && styles.pickerOptionSelected]}>
                    {opt}
                  </Text>
                  {tags.includes(opt) && <CheckCircle2 size={20} color={COLORS.primary} style={{ position: 'absolute', right: 20 }} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.saveButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.saveButtonText}><TranslatedText>Done</TranslatedText></Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default function DoctorProfileScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { getToken, userId, signOut } = useAuth();
  const { locale, setLocale, locales, localeInfo, t } = useLanguage();
  
  const { data: identity } = useDoctorIdentity(getToken);
  const uid = identity?.uid || userId;

  const { data: profile, isLoading, refetch: refetchProfile } = useDoctorProfile(uid, getToken);
  const { data: finance } = useDoctorFinance(uid, getToken);

  const updateProfileMutation = useUpdateProfile();
  const saveBankMutation = useSaveBankDetails();
  const requestVerifyMutation = useRequestVerification();

  const [saving, setSaving] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [requestingVerify, setRequestingVerify] = useState(false);
  
  const [formData, setFormData] = useState({
    prefix: 'Dr.', name: '', phone: '', email: '',
    specialization: [] as string[],
    qualification: '', registration_number: '',
    years_of_experience: '0', consultation_fee: '0',
    bio: '', clinic_name: '',
    languages: [] as string[],
    address_line1: '', address_line2: '', city: '', state: '', postal_code: '',
    profile_image_url: '',
  });

  const [payoutMethod, setPayoutMethod] = useState<'bank' | 'upi'>('bank');
  const [bankForm, setBankForm] = useState({
    accountHolderName: '', accountNumber: '', ifscCode: '',
    bankName: '', accountType: 'savings', branchName: '', payoutUpiId: '',
  });

  const [isVerified, setIsVerified] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showPrefixPicker, setShowPrefixPicker] = useState(false);

  const [clinicLocation, setClinicLocation] = useState<ClinicLocation | null>(null);
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeocodeResult[]>([]);
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  // Kept separate from geoSearching so the GPS fix and the debounced geocode
  // search cannot clear each other's spinner.
  const [locating, setLocating] = useState(false);
  const geoSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors formData.address_line1 so onFocus and the async GPS fix can read the
  // current value instead of a stale render closure.
  const addressLine1Ref = useRef('');

  const { showToast, showAlert, showConfirm } = useNotification();

  const performLogout = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/sign-in');
    } catch {
      setSigningOut(false);
      showToast('Failed to log out', undefined, 'error');
    }
  };

  const handleLogout = () => {
    // Alert is a no-op on react-native-web, which would turn this into a dead
    // button there. Confirm natively, act directly on web.
    if (Platform.OS === 'web') return void performLogout();

    showConfirm(
      'Log Out',
      'Are you sure you want to log out of your doctor portal?',
      performLogout,
      'Log Out',
      'Cancel',
      true
    );
  };


  useEffect(() => {
    if (profile) {
      setIsVerified(profile.doctor.is_verified);
      if (profile.doctor.verification_requested) setVerificationRequested(true);
      let dbName = profile.user.name;
      let currentPrefix = 'Dr.';
      const PREFIXES = ['Dr.', 'Mr.', 'Miss.', 'Smt.', 'Shri.'];
      for (const p of PREFIXES) {
        if (dbName.startsWith(p + ' ')) { currentPrefix = p; dbName = dbName.slice(p.length + 1); break; }
        else if (dbName.startsWith(p)) { currentPrefix = p; dbName = dbName.slice(p.length).trim(); break; }
      }

      setFormData({
        ...formData,
        prefix: currentPrefix, name: dbName, phone: profile.user.phone, email: profile.user.email,
        specialization: profile.doctor.specialization || [],
        qualification: profile.doctor.qualification || '',
        registration_number: profile.doctor.registration_number || '',
        years_of_experience: profile.doctor.years_of_experience?.toString() || '0',
        consultation_fee: profile.doctor.consultation_fee?.toString() || '0',
        bio: profile.doctor.bio || '',
        clinic_name: profile.doctor.clinic_name || '',
        languages: profile.doctor.languages || [],
        address_line1: profile.doctor.address_line1 || '',
        address_line2: profile.doctor.address_line2 || '',
        city: profile.doctor.city || '', state: profile.doctor.state || '', postal_code: profile.doctor.postal_code || '',
        profile_image_url: profile.user.profile_image_url || '',
      });

      const location = profile.doctor.clinicLocation ?? parseClinicGeo(profile.doctor.address_line2);
      addressLine1Ref.current = profile.doctor.address_line1 || '';
      setClinicLocation(location);
      setManualLat(location ? String(location.latitude) : '');
      setManualLng(location ? String(location.longitude) : '');
    }

    if (finance) {
      if (finance.bankForm) setBankForm(prev => ({ ...prev, ...finance.bankForm }));
      if (finance.payoutMethod) setPayoutMethod(finance.payoutMethod as any);
    }
  }, [profile, finance]);

  // Encode the chosen point into address_line2 so the existing save path and
  // PATCH endpoint persist it with no extra plumbing.
  const applyClinicLocation = useCallback((next: ClinicLocation | null) => {
    setClinicLocation(next);
    setFormData(prev => ({ ...prev, address_line2: formatClinicGeo(next) ?? '' }));
    if (next) {
      setManualLat(String(next.latitude));
      setManualLng(String(next.longitude));
    } else {
      setManualLat('');
      setManualLng('');
    }
  }, []);

/**
   * Read the phone's own GPS and fill the clinic address fields.
   *
   * `onlyIfEmpty` is used by the address input's onFocus so tapping it only ever
   * fills a blank field; the MapPin icon calls it without the flag to force a
   * refill of an address the doctor has already set.
   */
  const getCurrentLocation = async (onlyIfEmpty = false) => {
    if (locating) return;
    if (onlyIfEmpty && addressLine1Ref.current.trim()) return;

    try {
      setLocating(true);

      if (!(await Location.hasServicesEnabledAsync())) {
        Alert.alert(t('Location Unavailable'), t('Turn on location services on your device to use your current location.'));
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('Permission Denied'), t('Please grant location permissions in settings.'));
        return;
      }

      // High accuracy: the pin is a destination patients navigate to.
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const lat = fix.coords.latitude;
      const lng = fix.coords.longitude;

      const reverse = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const place = reverse && reverse.length > 0 ? reverse[0] : null;

      // Street-level text only; city/region get their own fields.
      const streetLine = [place?.streetNumber, place?.street].filter(Boolean).join(' ').trim();
      const addressStr =
        streetLine ||
        place?.formattedAddress ||
        place?.name ||
        t('Current Location');

      // The fix can resolve after the doctor started typing. In that case leave
      // everything untouched so the pin and the text never disagree.
      if (onlyIfEmpty && addressLine1Ref.current.trim()) return;

      applyClinicLocation({ latitude: lat, longitude: lng, label: addressStr });
      addressLine1Ref.current = addressStr;

      setFormData((prev) => ({
        ...prev,
        address_line1: addressStr,
        // Never overwrite a city/state/postal the doctor already has on file.
        city: prev.city?.trim() ? prev.city : (place?.city ?? ''),
        state: prev.state?.trim() ? prev.state : (place?.region ?? ''),
        postal_code: prev.postal_code?.trim() ? prev.postal_code : (place?.postalCode ?? ''),
      }));

      // Drop any stale autocomplete dropdown / pending search.
      if (geoSearchTimer.current) clearTimeout(geoSearchTimer.current);
      setGeoResults([]);
      setGeoError(null);
      setGeoQuery('');

      showToast(t('Location updated successfully'), undefined, 'success');
    } catch (error) {
      console.error('Error getting location:', error);
      showAlert(t('Error'), t('Failed to get current location'));
    } finally {
      setLocating(false);
    }
  };

  const runGeocodeSearch = useCallback(async (q: string) => {
    setGeoSearching(true);
    setGeoError(null);
    try {
      const res = await fetchWithAuth(`/api/doctor/clinic-geocode?q=${encodeURIComponent(q)}`, getToken);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setGeoError(body?.error || t('Location search failed'));
        setGeoResults([]);
        return;
      }
      const body = await res.json();
      setGeoResults(Array.isArray(body?.results) ? body.results : []);
      if (!body?.results?.length) {
        setGeoError(t('No matches found. Try a more specific address, or enter coordinates manually.'));
      }
    } catch {
      setGeoError(t('Location search is unavailable. You can enter coordinates manually.'));
      setGeoResults([]);
    } finally {
      setGeoSearching(false);
    }
  }, [getToken, t]);

  const handleGeoQueryChange = (text: string) => {
    setGeoQuery(text);
    if (geoSearchTimer.current) clearTimeout(geoSearchTimer.current);

    if (text.trim().length < 3) {
      setGeoResults([]);
      setGeoError(null);
      return;
    }

    // Debounced so typing does not hammer the geocoder.
    geoSearchTimer.current = setTimeout(() => { void runGeocodeSearch(text.trim()); }, 450);
  };

  const handleManualCoordinates = () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);

    if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
      showToast(t('Enter a valid latitude (-90..90) and longitude (-180..180)'), undefined, 'error');
      return;
    }

    applyClinicLocation({ latitude: lat, longitude: lng, label: clinicLocation?.label ?? '' });
    showToast(t('Clinic location set'), undefined, 'success');
  };

  const handleProfileSubmit = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      await updateProfileMutation.mutateAsync({ uid, data: formData, token });
      showToast('Profile updated', 'Your doctor profile has been saved.', 'success');
    } catch (error: any) {
      showToast('Update Failed', error.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBankSubmit = async () => {
    setSavingBank(true);
    try {
      const token = await getToken();
      await saveBankMutation.mutateAsync({ uid, payoutMethod, bankDetails: bankForm, token });
      showToast('Payout details saved', 'Your payout information has been updated.', 'success');
    } catch (error: any) {
      showToast('Failed to save bank details', error.message, 'error');
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestVerification = async () => {
    setRequestingVerify(true);
    try {
      const token = await getToken();
      await requestVerifyMutation.mutateAsync({ uid, token });
      setVerificationRequested(true);
      showToast('Request Sent', 'Your profile has been submitted for admin verification.', 'success');
    } catch (err: any) {
      showToast('Request Failed', err.message || 'Failed to send verification request', 'error');
    } finally {
      setRequestingVerify(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData(prev => ({ ...prev, profile_image_url: base64Image }));
      }
    } catch (err) {
      showAlert('Error', 'Failed to pick image from your device.');
    }
  };

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.text} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  if (refetchProfile) await refetchProfile();
                } finally {
                  setRefreshing(false);
                }
              }} 
              colors={['#048256']} 
              tintColor={'#048256'} 
            />
          }>
          
          <View style={styles.avatarSection}>
            <View style={styles.profileHeaderBg} />
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {formData.profile_image_url ? (
                <Image source={{ uri: formData.profile_image_url }} style={styles.avatarImage} />
              ) : (
                <Image source={require('@/assets/images/doctor-placeholder.jpg')} style={styles.avatarImage} />
              )}
              <View style={styles.cameraBadge}><Camera size={16} color={COLORS.text} /></View>
            </TouchableOpacity>
            <Text style={styles.userName}>{formData.prefix} {formData.name || 'Doctor Name'}</Text>
            <Text style={styles.userEmail}>{formData.email || 'No email provided'}</Text>
            {isVerified ? (
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>VERIFIED</Text></View>
            ) : verificationRequested ? (
              <View style={[styles.verifiedBadge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.verifiedText, { color: '#B45309' }]}>UNDER REVIEW</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.groupHeader}><TranslatedText>PREFERENCES</TranslatedText></Text>

          <TouchableOpacity 
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              backgroundColor: COLORS.white, 
              marginHorizontal: 14, 
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 14,
              marginBottom: 20 
            }} 
            onPress={() => setShowLanguagePicker(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Globe size={18} color={COLORS.text} />
              <Text style={{ fontSize: 15, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text }}>
                <TranslatedText>App Language</TranslatedText>
              </Text>
              </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 15, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray }}>
                {localeInfo.native}
              </Text>
              <ChevronRight size={16} color={COLORS.lightGray} />
              </View>
            </TouchableOpacity>


          <Text style={styles.groupHeader}><TranslatedText>BASIC INFO</TranslatedText></Text>
          <View style={styles.cardGroup}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Prefix</TranslatedText></Text>
              <TouchableOpacity style={styles.prefixSelect} onPress={() => setShowPrefixPicker(true)}>
                <Text style={[styles.prefixSelectText, !formData.prefix && styles.prefixSelectPlaceholder]}>
                  {formData.prefix || 'Dr.'}
                </Text>
                <ChevronRight size={16} color={COLORS.lightGray} />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Full Name</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} placeholder="John Doe" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Phone</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.phone} onChangeText={(t) => setFormData({...formData, phone: t})} keyboardType="phone-pad" placeholder="Phone number" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text, marginBottom: 8 }}>
                <TranslatedText>Bio</TranslatedText>
              </Text>
              <TextInput 
                style={{
                  minHeight: 80,
                  fontSize: 14,
                  fontFamily: FONTS.regular,
                  fontWeight: '400',
                  color: COLORS.text,
                  backgroundColor: COLORS.background,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  textAlignVertical: 'top',
                }} 
                multiline
                scrollEnabled={false}
                value={formData.bio} 
                onChangeText={(t) => setFormData({...formData, bio: t})} 
                placeholder="Write a brief bio about your practice, experience, and patient care approach..." 
                placeholderTextColor={COLORS.gray} 
              />
            </View>
          </View>

          <Text style={styles.groupHeader}><TranslatedText>PROFESSIONAL INFO</TranslatedText></Text>
          <View style={styles.cardGroup}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Qualification</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.qualification} onChangeText={(t) => setFormData({...formData, qualification: t})} placeholder="MBBS, MD" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Registration No.</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.registration_number} onChangeText={(t) => setFormData({...formData, registration_number: t})} placeholder="e.g. 12345" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Years of Exp</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.years_of_experience} onChangeText={(t) => setFormData({...formData, years_of_experience: t})} keyboardType="number-pad" placeholder="Years" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Consultation Fee</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.consultation_fee} onChangeText={(t) => setFormData({...formData, consultation_fee: t})} keyboardType="number-pad" placeholder="Fee in ₹" placeholderTextColor={COLORS.gray} />
            </View>
          </View>

          <Text style={styles.groupHeader}><TranslatedText>SPECIALIZATIONS</TranslatedText></Text>
          <View style={styles.cardGroup}>
            <TagInput 
              tags={formData.specialization} 
              onChange={(tags) => setFormData({...formData, specialization: tags})} 
              placeholder="Select specializations..." 
              options={SPECIALIZATIONS}
            />
          </View>

          <Text style={styles.groupHeader}><TranslatedText>LANGUAGES</TranslatedText></Text>
          <View style={styles.cardGroup}>
            <TagInput 
              tags={formData.languages} 
              onChange={(tags) => setFormData({...formData, languages: tags})} 
              placeholder="Select languages..." 
              options={LANGUAGES}
            />
          </View>

          <Text style={styles.groupHeader}><TranslatedText>CLINIC &amp; ADDRESS</TranslatedText></Text>
          <View style={styles.cardGroup}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Clinic Name</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.clinic_name} onChangeText={(t) => setFormData({...formData, clinic_name: t})} placeholder="Optional" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text }}>
                  <TranslatedText>Clinic Address</TranslatedText>
                </Text>
                <TouchableOpacity 
                  onPress={() => { void getCurrentLocation(); }} 
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: 6 }}
                >
                  <MapPin size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: COLORS.primary }}>
                    <TranslatedText>Use GPS</TranslatedText>
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, minHeight: 70 }}>
                <TextInput 
                  style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.text, padding: 0, minHeight: 54, textAlignVertical: 'top' }} 
                  multiline
                  scrollEnabled={false}
                  value={formData.address_line1} 
                  onChangeText={(t) => {
                    addressLine1Ref.current = t;
                    setFormData({...formData, address_line1: t});
                    if (geoSearchTimer.current) clearTimeout(geoSearchTimer.current);
                    if (t.trim().length >= 3) {
                      geoSearchTimer.current = setTimeout(() => { void runGeocodeSearch(t.trim()); }, 450);
                    } else {
                      setGeoResults([]);
                      setGeoError(null);
                    }
                  }} 
                  onFocus={() => {
                    if (!addressLine1Ref.current.trim()) void getCurrentLocation(true);
                  }}
                  placeholder={t('Search address or enter complete address manually...')} 
                  placeholderTextColor={COLORS.gray}
                  returnKeyType="search"
                  onSubmitEditing={() => { if (formData.address_line1.trim().length >= 3) { if (geoSearchTimer.current) clearTimeout(geoSearchTimer.current); void runGeocodeSearch(formData.address_line1.trim()); } }}
                />
                {(geoSearching || locating) && <ActivityIndicator size="small" color={COLORS.gray} style={{ marginLeft: 6, marginTop: 4 }} />}
              </View>
              {geoError ? <Text style={styles.geoError}>{geoError}</Text> : null}
              
              {geoResults.length > 0 && (
                <View style={[styles.geoResults, { marginTop: 8 }]}>
                  {geoResults.map((r, i) => (
                    <TouchableOpacity
                      key={`${r.lat},${r.lng},${i}`}
                      style={styles.geoResultRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        applyClinicLocation({ latitude: r.lat, longitude: r.lng, label: r.label });
                        addressLine1Ref.current = r.label;
                        setFormData((prev) => ({ ...prev, address_line1: r.label }));
                        setGeoResults([]);
                        showToast(t('Location selected'), undefined, 'success');
                      }}
                    >
                      <MapPin size={15} color={COLORS.text} style={{ marginRight: 8, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoResultLabel} numberOfLines={2}>{r.label}</Text>
                        <Text style={styles.geoResultCoords}>{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>City</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.city} onChangeText={(t) => setFormData({...formData, city: t})} placeholder="City" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>State</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={formData.state} onChangeText={(t) => setFormData({...formData, state: t})} placeholder="State" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            <View style={styles.geoSection}>
              <Text style={styles.geoTitle}><TranslatedText>Map Pin</TranslatedText></Text>
              <Text style={styles.geoHint}>
                <TranslatedText>Selecting an address above drops a map pin for patients. You can also set coordinates manually.</TranslatedText>
              </Text>

              {false && <View style={styles.geoSearchRow}>
                <Search size={16} color={COLORS.gray} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.geoSearchInput}
                  value={geoQuery}
                  onChangeText={handleGeoQueryChange}
                  placeholder={t('Search clinic name or address')}
                  placeholderTextColor={COLORS.gray}
                  returnKeyType="search"
                  onSubmitEditing={() => { if (geoQuery.trim().length >= 3) { if (geoSearchTimer.current) clearTimeout(geoSearchTimer.current); void runGeocodeSearch(geoQuery.trim()); } }}
                />
                {geoSearching && <ActivityIndicator size="small" color={COLORS.gray} />}
              </View>}

              {geoError ? <Text style={styles.geoError}>{geoError}</Text> : null}

              {false && (
                <View style={styles.geoResults}>
                  {geoResults.map((r, i) => (
                    <TouchableOpacity
                      key={`${r.lat},${r.lng},${i}`}
                      style={styles.geoResultRow}
                      activeOpacity={0.7}
                      onPress={() => {
                        applyClinicLocation({ latitude: r.lat, longitude: r.lng, label: r.label });
                        setGeoResults([]);
                        setGeoQuery('');
                        Toast.show({ type: 'success', text1: t('Location selected') });
                      }}
                    >
                      <MapPin size={15} color={COLORS.text} style={{ marginRight: 8, marginTop: 2 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.geoResultLabel} numberOfLines={2}>{r.label}</Text>
                        <Text style={styles.geoResultCoords}>{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.geoManualLabel}><TranslatedText>Or enter coordinates manually</TranslatedText></Text>
              <View style={styles.geoManualRow}>
                <TextInput
                  style={styles.geoCoordInput}
                  value={manualLat}
                  onChangeText={setManualLat}
                  placeholder={t('Latitude')}
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numbers-and-punctuation"
                />
                <TextInput
                  style={styles.geoCoordInput}
                  value={manualLng}
                  onChangeText={setManualLng}
                  placeholder={t('Longitude')}
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numbers-and-punctuation"
                />
                <TouchableOpacity style={styles.geoApplyBtn} onPress={handleManualCoordinates}>
                  <Text style={styles.geoApplyBtnText}><TranslatedText>Set</TranslatedText></Text>
                </TouchableOpacity>
              </View>

              {clinicLocation ? (
                <View style={styles.geoSelectedBox}>
                  <TileMapPreview location={clinicLocation} />
                  <View style={styles.geoSelectedMeta}>
                    <Text style={styles.geoSelectedLabel} numberOfLines={2}>
                      {clinicLocation.label || t('Pinned clinic location')}
                    </Text>
                    <Text style={styles.geoResultCoords}>
                      {clinicLocation.latitude.toFixed(5)}, {clinicLocation.longitude.toFixed(5)}
                    </Text>
                    <TouchableOpacity
                      style={styles.geoClearBtn}
                      onPress={() => { applyClinicLocation(null); setGeoQuery(''); setGeoResults([]); }}
                    >
                      <Trash2 size={13} color={COLORS.danger} style={{ marginRight: 6 }} />
                      <Text style={styles.geoClearText}><TranslatedText>Clear location</TranslatedText></Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.geoNoLocation}><TranslatedText>No clinic location set. Patients won't see a directions button.</TranslatedText></Text>
              )}
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleProfileSubmit} disabled={saving}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}><TranslatedText>Save Profile Info</TranslatedText></Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.groupHeader}><TranslatedText>PAYOUT SETUP</TranslatedText></Text>
          <View style={styles.cardGroup}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Method</TranslatedText></Text>
              <View style={styles.rowValueContainer}>
                <TouchableOpacity onPress={() => setPayoutMethod('bank')} style={[styles.payoutTab, payoutMethod === 'bank' && styles.payoutTabActive]}>
                  <Text style={[styles.payoutTabText, payoutMethod === 'bank' && styles.payoutTabTextActive]}>Bank</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPayoutMethod('upi')} style={[styles.payoutTab, payoutMethod === 'upi' && styles.payoutTabActive]}>
                  <Text style={[styles.payoutTabText, payoutMethod === 'upi' && styles.payoutTabTextActive]}>UPI</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}><TranslatedText>Holder Name</TranslatedText></Text>
              <TextInput style={styles.rowInput} value={bankForm.accountHolderName} onChangeText={t => setBankForm({...bankForm, accountHolderName: t})} placeholder="Name on account" placeholderTextColor={COLORS.gray} />
            </View>
            <View style={styles.divider} />
            
            {payoutMethod === 'bank' ? (
              <>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}><TranslatedText>Account No.</TranslatedText></Text>
                  <TextInput style={styles.rowInput} value={bankForm.accountNumber} onChangeText={t => setBankForm({...bankForm, accountNumber: t})} placeholder="Account number" placeholderTextColor={COLORS.gray} keyboardType="number-pad" />
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}><TranslatedText>IFSC Code</TranslatedText></Text>
                  <TextInput style={styles.rowInput} value={bankForm.ifscCode} onChangeText={t => setBankForm({...bankForm, ifscCode: t})} placeholder="e.g. SBIN0001234" placeholderTextColor={COLORS.gray} autoCapitalize="characters" />
                </View>
                <View style={styles.divider} />
                <View style={styles.row}>
                  <Text style={styles.rowLabel}><TranslatedText>Bank Name</TranslatedText></Text>
                  <TextInput style={styles.rowInput} value={bankForm.bankName} onChangeText={t => setBankForm({...bankForm, bankName: t})} placeholder="Bank name" placeholderTextColor={COLORS.gray} />
                </View>
              </>
            ) : (
              <View style={styles.row}>
                <Text style={styles.rowLabel}><TranslatedText>UPI ID</TranslatedText></Text>
                <TextInput style={styles.rowInput} value={bankForm.payoutUpiId} onChangeText={t => setBankForm({...bankForm, payoutUpiId: t})} placeholder="name@upi" placeholderTextColor={COLORS.gray} />
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleBankSubmit} disabled={savingBank}>
              {savingBank ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.saveButtonText}><TranslatedText>Save Payout Details</TranslatedText></Text>}
            </TouchableOpacity>

            {!isVerified && (
              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: verificationRequested ? COLORS.gray : COLORS.primary, marginTop: 16 }]} 
                onPress={handleRequestVerification} 
                disabled={requestingVerify || verificationRequested}
                activeOpacity={0.8}
              >
                {requestingVerify ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.saveButtonText}>
                    <TranslatedText>{verificationRequested ? 'Under Admin Review' : 'Request Verification'}</TranslatedText>
                  </Text>
                )}
              </TouchableOpacity>
            )}

          </View>

          <Text style={styles.groupHeader}><TranslatedText>SESSION</TranslatedText></Text>
          <View style={styles.cardGroup}>
            <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} disabled={signingOut}>
              <LogOut size={20} color="#FFFFFF" />
              <Text style={styles.logoutRowText}><TranslatedText>Log Out</TranslatedText></Text>
              {signingOut && <ActivityIndicator size="small" color={COLORS.white} />}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['bottom']} style={styles.pickerModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}><TranslatedText>Select Language</TranslatedText></Text>
            <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
              {locales.map((option) => {
                const active = option.code === locale;
                return (
                  <TouchableOpacity
                    key={option.code}
                    style={[styles.languageOption, active && styles.languageOptionActive]}
                    onPress={() => {
                      setLocale(option.code);
                      setShowLanguagePicker(false);
                    }}
                  >
                    <View style={styles.languageText}>
                      <Text style={[styles.languageNative, active && styles.languageTextActive]}>
                        {option.native}
                      </Text>
                      <Text style={styles.languageLabel}>{option.label}</Text>
                    </View>
                    {active && <Check size={20} color={COLORS.text} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowLanguagePicker(false)}>
              <Text style={styles.pickerCancelText}><TranslatedText>Done</TranslatedText></Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={showPrefixPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrefixPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView edges={['bottom']} style={styles.pickerModal}>
            <View style={styles.modalHandle} />
            <Text style={styles.pickerTitle}><TranslatedText>Select Prefix</TranslatedText></Text>
            <ScrollView style={styles.languageList} showsVerticalScrollIndicator={false}>
              {PREFIXES.map((option) => {
                const active = option === formData.prefix;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[styles.languageOption, active && styles.languageOptionActive]}
                    onPress={() => {
                      setFormData({ ...formData, prefix: option });
                      setShowPrefixPicker(false);
                    }}
                  >
                    <Text style={[styles.prefixOptionText, active && styles.prefixOptionTextActive]}>
                      {option}
                    </Text>
                    {active && <Check size={20} color={COLORS.text} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowPrefixPicker(false)}>
              <Text style={styles.pickerCancelText}><TranslatedText>Done</TranslatedText></Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 160 },
  
  profileHeaderBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 80, backgroundColor: '#A0C4FF', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  avatarSection: { alignItems: 'center', paddingTop: 16, paddingBottom: 24, position: 'relative' },
  avatarContainer: { position: 'relative', width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.white, },
  avatarImage: { width: '100%', height: '100%', borderRadius: 48 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 48, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.background },
  userName: { fontSize: 24, color: COLORS.text, fontFamily: FONTS.bold, fontWeight: '700', marginTop: 12, marginBottom: 2 },
  userEmail: { fontSize: 14, color: COLORS.gray, fontFamily: FONTS.medium, fontWeight: '500' },
  verifiedBadge: { marginTop: 8, backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  verifiedText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', color: '#166534', letterSpacing: 1 },

  groupHeader: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray, marginLeft: 14, marginBottom: 4, marginTop: 12, letterSpacing: 1 },
  cardGroup: { backgroundColor: COLORS.white, marginHorizontal: 14, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, minHeight: 60 },
  divider: { height: 1, backgroundColor: COLORS.background, marginLeft: 16 },
  rowLabel: { fontSize: 15, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text, width: 120 },
  rowInput: { flex: 1, minHeight: 40, textAlignVertical: 'center', fontSize: 15, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.text, textAlign: 'right', paddingVertical: 8, paddingHorizontal: 0 },
  prefixSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minHeight: 40 },
  prefixSelectText: { fontSize: 15, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.text, textAlign: 'right' },
  prefixSelectPlaceholder: { color: COLORS.gray },
  prefixOptionText: { fontSize: 16, color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500' },
  prefixOptionTextActive: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },
  rowValueContainer: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8, flexShrink: 1 },
  rowValue: { fontSize: 15, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginRight: 8 },

  geoSection: { paddingHorizontal: 14, paddingTop: 18, paddingBottom: 20 },
  geoTitle: { fontSize: 15, fontFamily: FONTS.serif,  color: COLORS.text },
  geoHint: { fontSize: 12, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray, marginTop: 4, lineHeight: 17 },
  geoSearchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: COLORS.background, borderRadius: 14, paddingHorizontal: 12, height: 48 },
  geoSearchInput: { flex: 1, height: '100%', fontSize: 14, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.text, paddingVertical: 0, paddingHorizontal: 0, textAlignVertical: 'center' },
  geoError: { fontSize: 12, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.danger, marginTop: 8, lineHeight: 16 },
  geoResults: { marginTop: 10, backgroundColor: COLORS.background, borderRadius: 14, overflow: 'hidden' },
  geoResultRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray },
  geoResultLabel: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text, lineHeight: 17 },
  geoResultCoords: { fontSize: 11, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray, marginTop: 3 },
  geoManualLabel: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginTop: 16 },
  geoManualRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  geoCoordInput: { flex: 1, fontSize: 13, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.text, backgroundColor: COLORS.background, borderRadius: 12, paddingHorizontal: 12, height: 44 },
  geoApplyBtn: { backgroundColor: COLORS.text, borderRadius: 12, paddingHorizontal: 14, height: 44, alignItems: 'center', justifyContent: 'center' },
  geoApplyBtnText: { fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.white },
  geoSelectedBox: { marginTop: 16, backgroundColor: COLORS.background, borderRadius: 16, padding: 8 },
  geoSelectedMeta: { marginTop: 10 },
  geoSelectedLabel: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.text, lineHeight: 17 },
  geoClearBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, alignSelf: 'flex-start' },
  geoClearText: { fontSize: 12, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.danger },
  geoNoLocation: { fontSize: 12, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.gray, marginTop: 16, lineHeight: 17 },

  mapFrame: { borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.lightGray, width: '100%', height: 200 },
  mapCanvas: { width: 768, height: 768, position: 'absolute', left: '50%', top: '50%', marginLeft: -384, marginTop: -384 },
  mapTile: { position: 'absolute', width: 256, height: 256 },
  mapMarker: { position: 'absolute', left: 384 - 13, top: 384 - 26 },
  mapAttribution: { position: 'absolute', right: 4, bottom: 3, fontSize: 9, fontFamily: FONTS.regular, fontWeight: '400', color: COLORS.primary, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },

  
  payoutTab: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  payoutTabActive: { backgroundColor: COLORS.primary },
  payoutTabText: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.gray },
  payoutTabTextActive: { color: '#FFFFFF' },

  tagSection: { paddingVertical: 12, paddingHorizontal: 14 },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tagPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 10, paddingVertical: 12, borderRadius: 12 },
  tagText: { fontSize: 13, color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500', marginRight: 4 },
  addTagBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  addTagText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray },

  footer: { marginTop: 8, paddingHorizontal: 14, marginBottom: 16 },
  saveButton: { backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 14, minHeight: 48 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700' },
  
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#EF4444', borderRadius: 12 },
  logoutRowText: { color: '#FFFFFF', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },

  rowLeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabelInline: { width: 'auto', flex: 1 },

  languageList: { width: '100%', maxHeight: 400, alignSelf: 'center' },
  languageOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, marginBottom: 6, backgroundColor: COLORS.background },
  languageOptionActive: { backgroundColor: COLORS.primaryLight },
  languageText: { flex: 1 },
  languageNative: { fontSize: 16, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.text },
  languageLabel: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '500', color: COLORS.gray, marginTop: 2 },
  languageTextActive: { fontFamily: FONTS.bold, fontWeight: '700' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.lightGray, marginBottom: 16 },


  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerModal: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 8, alignItems: 'center', paddingBottom: 40 },
  pickerTitle: { fontSize: 18, fontFamily: FONTS.serif,  color: COLORS.text, marginBottom: 20 },
  pickerOption: { paddingVertical: 12, width: '100%', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.background },
  pickerOptionText: { fontSize: 16, color: COLORS.text, fontFamily: FONTS.medium, fontWeight: '500' },
  pickerOptionSelected: { color: COLORS.primary, fontFamily: FONTS.bold, fontWeight: '700' },
  pickerCancel: { marginTop: 24, paddingVertical: 12, width: '100%', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 16 },
  pickerCancelText: { color: COLORS.danger, fontFamily: FONTS.bold, fontWeight: '700', fontSize: 16 },
});




