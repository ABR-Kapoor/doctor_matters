export interface ProfileCompleteness {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

function isPayoutReady(doctor: any): boolean {
  const bankReady = [
    doctor?.bank_account_holder_name,
    doctor?.bank_account_number,
    doctor?.bank_ifsc_code,
    doctor?.bank_name,
    doctor?.bank_account_type,
  ].every(hasValue);
  const upiReady = hasValue(doctor?.bank_account_holder_name) && hasValue(doctor?.payout_upi_id);
  return bankReady || upiReady;
}

export function checkDoctorProfileComplete(
  doctor: any,
  user: any,
  options: { requirePayout?: boolean } = {},
): ProfileCompleteness {
  const requirePayout = options.requirePayout !== false;
  const requiredFields = [
    { key: 'name', label: 'Full Name', value: user?.name },
    { key: 'phone', label: 'Phone Number', value: user?.phone },
    { key: 'profile_image_url', label: 'Profile Picture', value: user?.profile_image_url || doctor?.profile_image_url },
    { key: 'specialization', label: 'Specialization', value: doctor?.specialization?.length > 0 },
    { key: 'qualification', label: 'Qualification', value: doctor?.qualification },
    { key: 'years_of_experience', label: 'Years of Experience', value: doctor?.years_of_experience > 0 },
    { key: 'consultation_fee', label: 'Consultation Fee', value: doctor?.consultation_fee > 0 },
    { key: 'city', label: 'City', value: doctor?.city },
    { key: 'state', label: 'State', value: doctor?.state },
    ...(requirePayout
      ? [{ key: 'payout', label: 'Bank or UPI Details', value: isPayoutReady(doctor) }]
      : []),
  ];

  const missingFields: string[] = [];
  let completedCount = 0;

  requiredFields.forEach(field => {
    if (field.value) completedCount++;
    else missingFields.push(field.label);
  });

  const percentage = Math.round((completedCount / requiredFields.length) * 100);
  return { isComplete: percentage === 100, percentage, missingFields };
}
