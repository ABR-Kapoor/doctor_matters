const fs = require('fs');

const file = 'src/app/(dashboard)/index.tsx';
let c = fs.readFileSync(file, 'utf8');

// 1. Add ChevronRight import
if (!c.includes('ChevronRight')) {
  c = c.replace('lucide-react-native\';', 'ChevronRight } from \'lucide-react-native\';');
}
if (!c.includes(' X ')) {
  c = c.replace('ChevronRight } from', 'ChevronRight, X } from');
}

// 2. Replace the whole card mapping
const oldListStart = '<View style={styles.list}>';
const oldListEnd = '          ))}';

const newCardCode = `<View style={styles.list}>
          {currentAppointments.map((apt: any, index: number) => {
            const hasVideo = (apt.mode === 'online' || apt.mode === 'video') && (apt.status === 'confirmed' || apt.status === 'in_progress') && canJoinVideoCall(apt, now);
            const hasCompleteVisit = (apt.mode === 'offline' || apt.mode === 'clinic' || apt.mode === 'in-person' || apt.mode === 'in_person') && (apt.status === 'confirmed' || apt.status === 'in_progress');
            const hasMap = isInClinicMode(apt) && apt.status !== 'cancelled' && hasClinicLocation;
            const canConfirm = isPendingStatus(apt.status);
            const canSwitchMode = apt.status !== 'completed' && apt.status !== 'cancelled';
            const canPrescribe = apt.status === 'completed' || (apt.status === 'in_progress' && (apt.mode === 'online' || apt.mode === 'video'));
            const canCancel = isPendingStatus(apt.status) || apt.status === 'confirmed';
            const canComplete = apt.status === 'in_progress';

            return (
              <View key={aptKey(apt, index)} style={styles.card}>
                {/* Patient Info Row */}
                <View style={styles.patientInfoRow}>
                  <View style={styles.avatar}>
                    <User size={24} color={COLORS.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <NameText name={aptPatientName(apt)} fallback="Patient" style={{fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', color: COLORS.text}} />
                    <Text style={styles.timeText}>{aptDate(apt)} • {aptTime(apt)}</Text>
                  </View>
                  <View style={[styles.statusBadge, apt.status === 'in_progress' ? {backgroundColor: COLORS.completeBtnBg} : {}]}>
                    {apt.status === 'in_progress' && <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.completeBtnText, marginRight: 6}} />}
                    <Text style={[styles.statusText, apt.status === 'in_progress' ? {color: COLORS.completeBtnText} : {}]}>
                      <TranslatedText>{String(apt.status || 'pending')}</TranslatedText>
                    </Text>
                  </View>
                </View>

                {/* Complaint Row */}
                {aptComplaint(apt) ? (
                  <View style={styles.complaintBox}>
                    <View style={styles.complaintIconContainer}>
                      <FileText size={18} color={COLORS.text} />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={styles.complaintLabel}><TranslatedText>PATIENT'S COMPLAINT</TranslatedText></Text>
                      <Text style={styles.complaintText}>{String(Array.isArray(aptComplaint(apt)) ? aptComplaint(apt).join(', ') : aptComplaint(apt))}</Text>
                    </View>
                  </View>
                ) : null}

                {/* Primary Action Row */}
                {hasVideo && (
                  <TouchableOpacity 
                    style={styles.mainActionBtn}
                    onPress={() => router.push({ pathname: '/video-call', params: { aid: apt.aid ?? apt.id ?? apt._id, pid: apt.pid ?? apt.patient_id ?? apt.patientId } })}
                  >
                    <View style={styles.mainActionIconBg}>
                      <Video size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.mainActionTextContainer}>
                      <Text style={styles.mainActionTitle}>
                        <TranslatedText>{apt.status === 'in_progress' ? 'Rejoin Call' : 'Join Video Call'}</TranslatedText>
                      </Text>
                      <Text style={styles.mainActionSubtitle}><TranslatedText>Continue video consultation</TranslatedText></Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.white} />
                  </TouchableOpacity>
                )}

                {hasCompleteVisit && (
                  <TouchableOpacity 
                    style={styles.mainActionBtn}
                    onPress={() => router.push({ pathname: '/prescriptions/new', params: { pid: apt.pid ?? apt.patient_id ?? apt.patientId, aid: apt.aid ?? apt.id ?? apt._id } })}
                  >
                    <View style={styles.mainActionIconBg}>
                      <Check size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.mainActionTextContainer}>
                      <Text style={styles.mainActionTitle}><TranslatedText>Complete Visit</TranslatedText></Text>
                      <Text style={styles.mainActionSubtitle}><TranslatedText>Open offline consultation details</TranslatedText></Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.white} />
                  </TouchableOpacity>
                )}

                {canConfirm && (
                  <TouchableOpacity 
                    style={styles.mainActionBtn}
                    onPress={() => updateStatus.mutate(
                      { aid: apt.aid ?? apt.id ?? apt._id, status: 'confirmed', uid: uid || '', token: getToken },
                      { onSuccess: () => setActiveTab('confirmed') }
                    )}
                  >
                    <View style={styles.mainActionIconBg}>
                      <Check size={20} color={COLORS.white} />
                    </View>
                    <View style={styles.mainActionTextContainer}>
                      <Text style={styles.mainActionTitle}><TranslatedText>Confirm Appointment</TranslatedText></Text>
                      <Text style={styles.mainActionSubtitle}><TranslatedText>Accept this consultation</TranslatedText></Text>
                    </View>
                    <ChevronRight size={20} color={COLORS.white} />
                  </TouchableOpacity>
                )}

                {/* Quick Actions Grid */}
                {(canSwitchMode || canPrescribe || hasMap || canCancel) && (
                  <View style={{marginTop: 16}}>
                    <Text style={styles.quickActionsLabel}><TranslatedText>QUICK ACTIONS</TranslatedText></Text>
                    <View style={styles.quickActionsGrid}>
                      {canSwitchMode && (
                        <TouchableOpacity 
                          style={styles.quickActionBox}
                          onPress={() => changeMode.mutate({ aid: apt.aid ?? apt.id ?? apt._id, mode: apt.mode === 'online' ? 'offline' : 'online', uid: uid || '', token: getToken })}
                        >
                          <View style={styles.quickActionHeader}>
                            <View style={[styles.quickActionIconBg, {backgroundColor: COLORS.surface}]}>
                              <RefreshCw size={18} color={COLORS.text} />
                            </View>
                            <ChevronRight size={16} color={COLORS.gray} />
                          </View>
                          <Text style={styles.quickActionTitle}><TranslatedText>Switch Mode</TranslatedText></Text>
                          <Text style={styles.quickActionDesc}><TranslatedText>Change consultation mode</TranslatedText></Text>
                        </TouchableOpacity>
                      )}

                      {canPrescribe && (
                        <TouchableOpacity 
                          style={styles.quickActionBox}
                          onPress={() => router.push({
                            pathname: '/prescriptions/new',
                            params: {
                              pid: apt.pid ?? apt.patient_id ?? apt.patientId,
                              aid: apt.aid ?? apt.id ?? apt._id,
                              ...(apt.status === 'in_progress' ? { ai: '1' } : {})
                            }
                          })}
                        >
                          <View style={styles.quickActionHeader}>
                            <View style={[styles.quickActionIconBg, {backgroundColor: COLORS.surface}]}>
                              <FileText size={18} color={COLORS.text} />
                            </View>
                            <ChevronRight size={16} color={COLORS.gray} />
                          </View>
                          <Text style={styles.quickActionTitle}><TranslatedText>Create Prescription</TranslatedText></Text>
                          <Text style={styles.quickActionDesc}><TranslatedText>Add prescription for patient</TranslatedText></Text>
                        </TouchableOpacity>
                      )}

                      {hasMap && (
                        <TouchableOpacity style={styles.quickActionBox} onPress={openClinicMap}>
                          <View style={styles.quickActionHeader}>
                            <View style={[styles.quickActionIconBg, {backgroundColor: COLORS.surface}]}>
                              <MapPin size={18} color={COLORS.text} />
                            </View>
                            <ChevronRight size={16} color={COLORS.gray} />
                          </View>
                          <Text style={styles.quickActionTitle}><TranslatedText>Map</TranslatedText></Text>
                          <Text style={styles.quickActionDesc}><TranslatedText>Open clinic location</TranslatedText></Text>
                        </TouchableOpacity>
                      )}

                      {canCancel && (
                        <TouchableOpacity 
                          style={styles.quickActionBox}
                          onPress={() => updateStatus.mutate(
                            { aid: apt.aid ?? apt.id ?? apt._id, status: 'cancelled', uid: uid || '', token: getToken },
                            { onSuccess: () => setActiveTab('cancelled') }
                          )}
                        >
                          <View style={styles.quickActionHeader}>
                            <View style={[styles.quickActionIconBg, {backgroundColor: COLORS.surface}]}>
                              <X size={18} color={COLORS.error} />
                            </View>
                            <ChevronRight size={16} color={COLORS.gray} />
                          </View>
                          <Text style={styles.quickActionTitle}><TranslatedText>Cancel</TranslatedText></Text>
                          <Text style={styles.quickActionDesc}><TranslatedText>Cancel this appointment</TranslatedText></Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Bottom Complete Action */}
                {canComplete && (
                  <TouchableOpacity
                    style={styles.bottomCompleteBtn}
                    disabled={updateStatus.isPending && updateStatus.variables?.aid === (apt.aid ?? apt.id ?? apt._id)}
                    onPress={() => updateStatus.mutate(
                      { aid: apt.aid ?? apt.id ?? apt._id, status: 'completed', uid: uid || '', token: getToken },
                      { onSuccess: () => setActiveTab('completed') }
                    )}
                  >
                    <View style={styles.bottomCompleteIconBg}>
                      <Check size={18} color={COLORS.white} />
                    </View>
                    <View style={styles.bottomCompleteTextContainer}>
                      <Text style={styles.bottomCompleteTitle}>
                        {updateStatus.isPending && updateStatus.variables?.aid === (apt.aid ?? apt.id ?? apt._id)
                          ? 'Marking...'
                          : 'Mark as Completed'}
                      </Text>
                      <Text style={styles.bottomCompleteSubtitle}><TranslatedText>End this consultation</TranslatedText></Text>
                    </View>
                  </TouchableOpacity>
                )}

              </View>
            );
          })}`;

const startIdx = c.indexOf(oldListStart);
const endIdx = c.indexOf(oldListEnd, startIdx) + oldListEnd.length;

if (startIdx !== -1 && endIdx !== -1) {
  c = c.substring(0, startIdx) + newCardCode + c.substring(endIdx);
}

// 3. Add styles
const newStyles = `  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  complaintRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  complaintIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  mainActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.text,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  mainActionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  mainActionTextContainer: {
    flex: 1,
  },
  mainActionTitle: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 2,
  },
  mainActionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontFamily: FONTS.regular,
    fontSize: 13,
  },
  quickActionsLabel: {
    fontSize: 11,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.gray,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionBox: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
  },
  quickActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  quickActionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionTitle: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  quickActionDesc: {
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: FONTS.regular,
    lineHeight: 16,
  },
  bottomCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.completeBtnBg,
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  bottomCompleteIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.completeBtnText,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bottomCompleteTextContainer: {
    flex: 1,
  },
  bottomCompleteTitle: {
    color: COLORS.completeBtnText,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 2,
  },
  bottomCompleteSubtitle: {
    color: COLORS.completeBtnText,
    opacity: 0.8,
    fontFamily: FONTS.regular,
    fontSize: 13,
  },`;

const stylesIdx = c.indexOf('  actions: {');
if (stylesIdx !== -1) {
  c = c.substring(0, stylesIdx) + newStyles + '\n' + c.substring(stylesIdx);
}

fs.writeFileSync(file, c);
