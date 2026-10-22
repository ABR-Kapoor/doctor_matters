// Profile completeness checking utilities

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

function isBankReady(doctor: any): boolean {
    const holder = doctor?.bank_account_holder_name;
    const number = doctor?.bank_account_number;
    const ifsc = doctor?.bank_ifsc_code;
    const bank = doctor?.bank_name;
    const type = doctor?.bank_account_type;
    return [holder, number, ifsc, bank, type].every(hasValue);
}

function isUpiReady(doctor: any): boolean {
    return hasValue(doctor?.bank_account_holder_name) && hasValue(doctor?.payout_upi_id);
}

function isPayoutReady(doctor: any): boolean {
    return isBankReady(doctor) || isUpiReady(doctor);
}

export function checkDoctorProfileComplete(doctor: any, user: any): ProfileCompleteness {
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
        { key: 'payout', label: 'Bank or UPI Details', value: isPayoutReady(doctor) },
    ];

    const missingFields: string[] = [];
    let completedCount = 0;

    requiredFields.forEach(field => {
        if (field.value) {
            completedCount++;
        } else {
            missingFields.push(field.label);
        }
    });

    const percentage = Math.round((completedCount / requiredFields.length) * 100);
    const isComplete = percentage === 100;

    return { isComplete, percentage, missingFields };
}

export function checkPatientProfileComplete(patient: any, user: any): ProfileCompleteness {
    const requiredFields = [
        { key: 'name', label: 'Full Name', value: user?.name },
        { key: 'phone', label: 'Phone Number', value: user?.phone },
        { key: 'date_of_birth', label: 'Date of Birth', value: patient?.date_of_birth },
        { key: 'gender', label: 'Gender', value: patient?.gender },
        { key: 'blood_group', label: 'Blood Group', value: patient?.blood_group },
    ];

    const missingFields: string[] = [];
    let completedCount = 0;

    requiredFields.forEach(field => {
        if (field.value) {
            completedCount++;
        } else {
            missingFields.push(field.label);
        }
    });

    const percentage = Math.round((completedCount / requiredFields.length) * 100);
    const isComplete = percentage === 100;

    return { isComplete, percentage, missingFields };
}

export function checkClinicProfileComplete(clinic: any, user: any): ProfileCompleteness {
    const requiredFields = [
        { key: 'clinic_name', label: 'Clinic Name', value: clinic?.clinic_name },
        { key: 'address', label: 'Address', value: clinic?.address_line1 },
        { key: 'city', label: 'City', value: clinic?.city },
        { key: 'state', label: 'State', value: clinic?.state },
        { key: 'phone', label: 'Phone Number', value: clinic?.phone },
        { key: 'admin_name', label: 'Admin Contact Name', value: user?.name },
    ];

    const missingFields: string[] = [];
    let completedCount = 0;

    requiredFields.forEach(field => {
        if (field.value) {
            completedCount++;
        } else {
            missingFields.push(field.label);
        }
    });

    const percentage = Math.round((completedCount / requiredFields.length) * 100);
    const isComplete = percentage === 100;

    return { isComplete, percentage, missingFields };
}
